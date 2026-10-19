import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
} from '../../common/dto/pagination.dto.js';
import { Company } from '../companies/entities/company.entity.js';
import { CreateWorkerDto } from './dto/create-worker.dto.js';
import { FindWorkersQueryDto } from './dto/find-workers-query.dto.js';
import { UpdateWorkerDto } from './dto/update-worker.dto.js';
import { Worker } from './entities/worker.entity.js';

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private readonly repository: Repository<Worker>,
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createWorkerDto: CreateWorkerDto): Promise<Worker> {
    await this.ensureCompanyExists(createWorkerDto.empresaId);

    const worker = this.repository.create({
      nombreCompleto: createWorkerDto.nombreCompleto,
      cargo: createWorkerDto.cargo ?? null,
      email: createWorkerDto.email ?? null,
      empresaId: createWorkerDto.empresaId ?? null,
      esMiembroCc: createWorkerDto.esMiembroCc ?? false,
      cargoCc: createWorkerDto.cargoCc ?? null,
    });

    const saved = await this.repository.save(worker);
    return this.findOne(saved.id);
  }

  async findAll(query: FindWorkersQueryDto): Promise<PaginatedResult<Worker>> {
    const qb = this.repository
      .createQueryBuilder('worker')
      .leftJoinAndSelect('worker.empresa', 'empresa');

    if (query.search) {
      qb.andWhere(
        '(worker.nombreCompleto LIKE :search OR worker.email LIKE :search OR worker.cargo LIKE :search OR worker.cargoCc LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.empresaId) {
      qb.andWhere('worker.empresaId = :empresaId', {
        empresaId: query.empresaId,
      });
    }

    if (query.esMiembroCc !== undefined) {
      qb.andWhere('worker.esMiembroCc = :esMiembroCc', {
        esMiembroCc: query.esMiembroCc,
      });
    }

    const [workers, total] = await qb
      .orderBy('worker.createdAt', 'DESC')
      .take(query.limit)
      .skip(query.skip)
      .getManyAndCount();

    return buildPaginatedResult(workers, total, query.page, query.limit);
  }

  async findOne(id: number): Promise<Worker> {
    const worker = await this.repository.findOne({
      where: { id },
      relations: { empresa: true },
    });

    if (!worker) {
      throw new NotFoundException(`Trabajador con id ${id} no encontrado.`);
    }

    return worker;
  }

  async update(id: number, updateWorkerDto: UpdateWorkerDto): Promise<Worker> {
    const worker = await this.findOne(id);

    if (updateWorkerDto.empresaId !== undefined) {
      if (updateWorkerDto.empresaId !== null) {
        await this.ensureCompanyExists(updateWorkerDto.empresaId);
      }
      worker.empresaId = updateWorkerDto.empresaId;
    }

    if (updateWorkerDto.nombreCompleto !== undefined) {
      worker.nombreCompleto = updateWorkerDto.nombreCompleto;
    }

    if (updateWorkerDto.cargo !== undefined) {
      worker.cargo = updateWorkerDto.cargo;
    }

    if (updateWorkerDto.email !== undefined) {
      worker.email = updateWorkerDto.email;
    }

    if (updateWorkerDto.esMiembroCc !== undefined) {
      worker.esMiembroCc = updateWorkerDto.esMiembroCc;
    }

    if (updateWorkerDto.cargoCc !== undefined) {
      worker.cargoCc = updateWorkerDto.cargoCc;
    }

    await this.repository.save(worker);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const worker = await this.findOne(id);

    await this.dataSource.query(
      'DELETE FROM meeting_workers WHERE worker_id = ?',
      [id],
    );

    await this.repository.remove(worker);
  }

  private async ensureCompanyExists(empresaId?: number): Promise<void> {
    if (!empresaId) {
      return;
    }

    const company = await this.companiesRepository.findOne({
      where: { id: empresaId },
    });

    if (!company) {
      throw new NotFoundException(
        `La empresa con id ${empresaId} no existe en el sistema.`,
      );
    }
  }
}
