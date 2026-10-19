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
    await this.ensureCompanyExists(createWorkerDto.companyId);

    const worker = this.repository.create({
      fullName: createWorkerDto.fullName,
      position: createWorkerDto.position ?? null,
      email: createWorkerDto.email ?? null,
      companyId: createWorkerDto.companyId ?? null,
      isCcMember: createWorkerDto.isCcMember ?? false,
      ccPosition: createWorkerDto.ccPosition ?? null,
    });

    const saved = await this.repository.save(worker);
    return this.findOne(saved.id);
  }

  async findAll(query: FindWorkersQueryDto): Promise<PaginatedResult<Worker>> {
    const qb = this.repository
      .createQueryBuilder('worker')
      .leftJoinAndSelect('worker.company', 'company');

    if (query.search) {
      qb.andWhere(
        '(worker.fullName LIKE :search OR worker.email LIKE :search OR worker.position LIKE :search OR worker.ccPosition LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.companyId) {
      qb.andWhere('worker.companyId = :companyId', {
        companyId: query.companyId,
      });
    }

    if (query.isCcMember !== undefined) {
      qb.andWhere('worker.isCcMember = :isCcMember', {
        isCcMember: query.isCcMember,
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
      relations: { company: true },
    });

    if (!worker) {
      throw new NotFoundException(`Trabajador con id ${id} no encontrado.`);
    }

    return worker;
  }

  async update(id: number, updateWorkerDto: UpdateWorkerDto): Promise<Worker> {
    const worker = await this.findOne(id);

    if (updateWorkerDto.companyId !== undefined) {
      if (updateWorkerDto.companyId !== null) {
        await this.ensureCompanyExists(updateWorkerDto.companyId);
      }
      worker.companyId = updateWorkerDto.companyId;
    }

    if (updateWorkerDto.fullName !== undefined) {
      worker.fullName = updateWorkerDto.fullName;
    }

    if (updateWorkerDto.position !== undefined) {
      worker.position = updateWorkerDto.position;
    }

    if (updateWorkerDto.email !== undefined) {
      worker.email = updateWorkerDto.email;
    }

    if (updateWorkerDto.isCcMember !== undefined) {
      worker.isCcMember = updateWorkerDto.isCcMember;
    }

    if (updateWorkerDto.ccPosition !== undefined) {
      worker.ccPosition = updateWorkerDto.ccPosition;
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

  private async ensureCompanyExists(companyId?: number): Promise<void> {
    if (!companyId) {
      return;
    }

    const company = await this.companiesRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(
        `La empresa con id ${companyId} no existe en el sistema.`,
      );
    }
  }
}
