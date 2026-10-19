import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
} from '../../common/dto/pagination.dto.js';
import { Contract } from '../contracts/entities/contract.entity.js';
import { Meeting } from '../meetings/entities/meeting.entity.js';
import { Worker } from '../workers/entities/worker.entity.js';
import { CreateAgreementDto } from './dto/create-agreement.dto.js';
import { FindAgreementsQueryDto } from './dto/find-agreements-query.dto.js';
import { UpdateAgreementDto } from './dto/update-agreement.dto.js';
import { Agreement } from './entities/agreement.entity.js';
import { AgreementStatus } from './entities/agreement-status.enum.js';

@Injectable()
export class AgreementsService {
  constructor(
    @InjectRepository(Agreement)
    private readonly repository: Repository<Agreement>,
    @InjectRepository(Meeting)
    private readonly meetingsRepository: Repository<Meeting>,
    @InjectRepository(Contract)
    private readonly contractsRepository: Repository<Contract>,
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
  ) {}

  async create(createAgreementDto: CreateAgreementDto): Promise<Agreement> {
    await this.ensureNumeroAcuerdoIsAvailable(createAgreementDto.numeroAcuerdo);
    await this.ensureActaExists(createAgreementDto.actaCcId);
    await this.ensureResponsableExists(createAgreementDto.responsableId);

    if (createAgreementDto.contratoId) {
      await this.ensureContractExists(createAgreementDto.contratoId);
    }

    const agreement = this.repository.create({
      numeroAcuerdo: createAgreementDto.numeroAcuerdo,
      actaCcId: createAgreementDto.actaCcId,
      contratoId: createAgreementDto.contratoId ?? null,
      punto: createAgreementDto.punto ?? null,
      detalle: createAgreementDto.detalle,
      responsableId: createAgreementDto.responsableId,
      fechaCumplimiento: createAgreementDto.fechaCumplimiento,
      estadoCumplimiento:
        createAgreementDto.estadoCumplimiento ?? AgreementStatus.PENDIENTE,
    });

    const saved = await this.repository.save(agreement);
    return this.findOne(saved.id);
  }

  async findAll(
    query: FindAgreementsQueryDto,
  ): Promise<PaginatedResult<Agreement>> {
    const qb = this.repository
      .createQueryBuilder('agreement')
      .leftJoinAndSelect('agreement.actaCc', 'actaCc')
      .leftJoinAndSelect('agreement.contrato', 'contrato')
      .leftJoinAndSelect('agreement.responsable', 'responsable');

    if (query.search) {
      qb.andWhere(
        '(agreement.numeroAcuerdo LIKE :search OR agreement.detalle LIKE :search OR agreement.punto LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.actaCcId) {
      qb.andWhere('agreement.actaCcId = :actaCcId', {
        actaCcId: query.actaCcId,
      });
    }

    if (query.contratoId) {
      qb.andWhere('agreement.contratoId = :contratoId', {
        contratoId: query.contratoId,
      });
    }

    if (query.responsableId) {
      qb.andWhere('agreement.responsableId = :responsableId', {
        responsableId: query.responsableId,
      });
    }

    if (query.estadoCumplimiento) {
      qb.andWhere('agreement.estadoCumplimiento = :estado', {
        estado: query.estadoCumplimiento,
      });
    }

    const [agreements, total] = await qb
      .orderBy('agreement.createdAt', 'DESC')
      .take(query.limit)
      .skip(query.skip)
      .getManyAndCount();

    return buildPaginatedResult(agreements, total, query.page, query.limit);
  }

  async findOne(id: number): Promise<Agreement> {
    const agreement = await this.repository.findOne({
      where: { id },
      relations: {
        actaCc: true,
        contrato: true,
        responsable: true,
      },
    });

    if (!agreement) {
      throw new NotFoundException(`Acuerdo con id ${id} no encontrado.`);
    }

    return agreement;
  }

  async update(
    id: number,
    updateAgreementDto: UpdateAgreementDto,
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (
      updateAgreementDto.numeroAcuerdo &&
      updateAgreementDto.numeroAcuerdo !== agreement.numeroAcuerdo
    ) {
      await this.ensureNumeroAcuerdoIsAvailable(
        updateAgreementDto.numeroAcuerdo,
        id,
      );
      agreement.numeroAcuerdo = updateAgreementDto.numeroAcuerdo;
    }

    if (updateAgreementDto.actaCcId !== undefined) {
      await this.ensureActaExists(updateAgreementDto.actaCcId);
      agreement.actaCcId = updateAgreementDto.actaCcId;
    }

    if (updateAgreementDto.contratoId !== undefined) {
      if (updateAgreementDto.contratoId !== null) {
        await this.ensureContractExists(updateAgreementDto.contratoId);
      }
      agreement.contratoId = updateAgreementDto.contratoId;
    }

    if (updateAgreementDto.responsableId !== undefined) {
      await this.ensureResponsableExists(updateAgreementDto.responsableId);
      agreement.responsableId = updateAgreementDto.responsableId;
    }

    if (updateAgreementDto.punto !== undefined) {
      agreement.punto = updateAgreementDto.punto;
    }

    if (updateAgreementDto.detalle !== undefined) {
      agreement.detalle = updateAgreementDto.detalle;
    }

    if (updateAgreementDto.fechaCumplimiento !== undefined) {
      agreement.fechaCumplimiento = updateAgreementDto.fechaCumplimiento;
    }

    if (updateAgreementDto.estadoCumplimiento !== undefined) {
      agreement.estadoCumplimiento = updateAgreementDto.estadoCumplimiento;
    }

    await this.repository.save(agreement);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const agreement = await this.findOne(id);
    await this.repository.remove(agreement);
  }

  private async ensureNumeroAcuerdoIsAvailable(
    numeroAcuerdo: string,
    ignoreId?: number,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { numeroAcuerdo },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(
        `Ya existe un acuerdo con el número ${numeroAcuerdo}.`,
      );
    }
  }

  private async ensureActaExists(actaId: number): Promise<void> {
    const acta = await this.meetingsRepository.findOne({ where: { id: actaId } });
    if (!acta) {
      throw new NotFoundException(`Acta del Comité con id ${actaId} no encontrada.`);
    }
  }

  private async ensureContractExists(contratoId: number): Promise<void> {
    const contrato = await this.contractsRepository.findOne({
      where: { id: contratoId },
    });
    if (!contrato) {
      throw new NotFoundException(`Contrato con id ${contratoId} no encontrado.`);
    }
  }

  private async ensureResponsableExists(workerId: number): Promise<void> {
    const worker = await this.workersRepository.findOne({
      where: { id: workerId },
    });
    if (!worker) {
      throw new NotFoundException(
        `Trabajador responsable con id ${workerId} no encontrado.`,
      );
    }
  }
}
