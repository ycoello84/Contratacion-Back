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
    await this.ensureAgreementNumberIsAvailable(
      createAgreementDto.agreementNumber,
    );
    await this.ensureActaExists(createAgreementDto.actCcId);
    await this.ensureResponsableExists(createAgreementDto.responsibleId);

    if (createAgreementDto.contractId) {
      await this.ensureContractExists(createAgreementDto.contractId);
    }

    const agreement = this.repository.create({
      agreementNumber: createAgreementDto.agreementNumber,
      actCcId: createAgreementDto.actCcId,
      contractId: createAgreementDto.contractId ?? null,
      point: createAgreementDto.point ?? null,
      detail: createAgreementDto.detail,
      responsibleId: createAgreementDto.responsibleId,
      complianceDate: createAgreementDto.complianceDate,
      complianceStatus:
        createAgreementDto.complianceStatus ?? AgreementStatus.PENDIENTE,
    });

    const saved = await this.repository.save(agreement);
    return this.findOne(saved.id);
  }

  async findAll(
    query: FindAgreementsQueryDto,
  ): Promise<PaginatedResult<Agreement>> {
    const qb = this.repository
      .createQueryBuilder('agreement')
      .leftJoinAndSelect('agreement.actCc', 'actCc')
      .leftJoinAndSelect('agreement.contract', 'contract')
      .leftJoinAndSelect('agreement.responsible', 'responsible');

    if (query.search) {
      qb.andWhere(
        '(agreement.agreementNumber LIKE :search OR agreement.detail LIKE :search OR agreement.point LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.actCcId) {
      qb.andWhere('agreement.actCcId = :actCcId', {
        actCcId: query.actCcId,
      });
    }

    if (query.contractId) {
      qb.andWhere('agreement.contractId = :contractId', {
        contractId: query.contractId,
      });
    }

    if (query.responsibleId) {
      qb.andWhere('agreement.responsibleId = :responsibleId', {
        responsibleId: query.responsibleId,
      });
    }

    if (query.complianceStatus) {
      qb.andWhere('agreement.complianceStatus = :estado', {
        estado: query.complianceStatus,
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
        actCc: true,
        contract: true,
        responsible: true,
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
      updateAgreementDto.agreementNumber &&
      updateAgreementDto.agreementNumber !== agreement.agreementNumber
    ) {
      await this.ensureAgreementNumberIsAvailable(
        updateAgreementDto.agreementNumber,
        id,
      );
      agreement.agreementNumber = updateAgreementDto.agreementNumber;
    }

    if (updateAgreementDto.actCcId !== undefined) {
      await this.ensureActaExists(updateAgreementDto.actCcId);
      agreement.actCcId = updateAgreementDto.actCcId;
    }

    if (updateAgreementDto.contractId !== undefined) {
      if (updateAgreementDto.contractId !== null) {
        await this.ensureContractExists(updateAgreementDto.contractId);
      }
      agreement.contractId = updateAgreementDto.contractId;
    }

    if (updateAgreementDto.responsibleId !== undefined) {
      await this.ensureResponsableExists(updateAgreementDto.responsibleId);
      agreement.responsibleId = updateAgreementDto.responsibleId;
    }

    if (updateAgreementDto.point !== undefined) {
      agreement.point = updateAgreementDto.point;
    }

    if (updateAgreementDto.detail !== undefined) {
      agreement.detail = updateAgreementDto.detail;
    }

    if (updateAgreementDto.complianceDate !== undefined) {
      agreement.complianceDate = updateAgreementDto.complianceDate;
    }

    if (updateAgreementDto.complianceStatus !== undefined) {
      agreement.complianceStatus = updateAgreementDto.complianceStatus;
    }

    await this.repository.save(agreement);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const agreement = await this.findOne(id);
    await this.repository.remove(agreement);
  }

  private async ensureAgreementNumberIsAvailable(
    agreementNumber: string,
    ignoreId?: number,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { agreementNumber },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(
        `Ya existe un acuerdo con el número ${agreementNumber}.`,
      );
    }
  }

  private async ensureActaExists(actaId: number): Promise<void> {
    const acta = await this.meetingsRepository.findOne({ where: { id: actaId } });
    if (!acta) {
      throw new NotFoundException(`Acta del Comité con id ${actaId} no encontrada.`);
    }
  }

  private async ensureContractExists(contractId: number): Promise<void> {
    const contract = await this.contractsRepository.findOne({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contrato con id ${contractId} no encontrado.`);
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
