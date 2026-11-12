import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
} from '../../../common/dto/pagination.dto.js';
import { CreateContractRequestDto } from '../dto/create-contract-request.dto.js';
import { FindContractRequestsQueryDto } from '../dto/find-contract-requests-query.dto.js';
import { ContractRequest } from '../entities/contract-request.entity.js';
import {
  AmountType,
  InstrumentCategory,
} from '../enums/contracting.enums.js';

/**
 * Servicio de dominio para la gestión de solicitudes de contrato.
 * Implementa validaciones de negocio (jerarquía padre-hijo, coherencia de montos)
 * y operaciones atómicas mediante transacciones explícitas.
 */
@Injectable()
export class ContractRequestService {
  constructor(
    @InjectRepository(ContractRequest)
    private readonly requestRepo: Repository<ContractRequest>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Crea una nueva solicitud validando unicidad de código ECIE, reglas de jerarquía
   * documental y coherencia entre modalidad de valor y monto numérico.
   */
  async create(dto: CreateContractRequestDto): Promise<ContractRequest> {
    const existing = await this.requestRepo.findOne({
      where: { ecieInternalCode: dto.ecieInternalCode },
    });
    if (existing) {
      throw new ConflictException(
        `El código interno ${dto.ecieInternalCode} ya se encuentra registrado.`,
      );
    }

    if (
      dto.instrumentCategory !== InstrumentCategory.MASTER_CONTRACT &&
      !dto.parentContractId
    ) {
      throw new BadRequestException(
        'Un Contrato Específico o Suplemento debe estar vinculado a un Contrato Principal (parentContractId).',
      );
    }

    if (dto.amountType !== AmountType.FIXED_AMOUNT && dto.amount != null) {
      throw new BadRequestException(
        'Los contratos de tipo SUMMATION o NO_VALUE_REFERRED no deben tener un monto fijo asignado.',
      );
    }

    const entity = this.requestRepo.create(dto);
    return this.requestRepo.save(entity);
  }

  async findAll(
    query: FindContractRequestsQueryDto,
  ): Promise<PaginatedResult<ContractRequest>> {
    const qb = this.requestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.counterparty', 'counterparty')
      .leftJoinAndSelect('request.contractType', 'contractType')
      .leftJoinAndSelect('request.specializedArea', 'specializedArea')
      .leftJoinAndSelect('request.parentContract', 'parentContract');

    if (query.search) {
      qb.andWhere(
        '(request.ecieInternalCode LIKE :search OR request.subject LIKE :search OR request.counterpartyContractNumber LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.counterpartyId) {
      qb.andWhere('request.counterpartyId = :counterpartyId', {
        counterpartyId: query.counterpartyId,
      });
    }

    if (query.contractTypeId) {
      qb.andWhere('request.contractTypeId = :contractTypeId', {
        contractTypeId: query.contractTypeId,
      });
    }

    if (query.specializedAreaId) {
      qb.andWhere('request.specializedAreaId = :specializedAreaId', {
        specializedAreaId: query.specializedAreaId,
      });
    }

    if (query.instrumentCategory) {
      qb.andWhere('request.instrumentCategory = :instrumentCategory', {
        instrumentCategory: query.instrumentCategory,
      });
    }

    if (query.approvalStatus) {
      qb.andWhere('request.approvalStatus = :approvalStatus', {
        approvalStatus: query.approvalStatus,
      });
    }

    if (query.amountType) {
      qb.andWhere('request.amountType = :amountType', {
        amountType: query.amountType,
      });
    }

    if (query.validityType) {
      qb.andWhere('request.validityType = :validityType', {
        validityType: query.validityType,
      });
    }

    if (query.registrationYear) {
      qb.andWhere('request.registrationYear = :registrationYear', {
        registrationYear: query.registrationYear,
      });
    }

    const [requests, total] = await qb
      .orderBy('request.createdAt', 'DESC')
      .take(query.limit)
      .skip(query.skip)
      .getManyAndCount();

    return buildPaginatedResult(requests, total, query.page, query.limit);
  }

  async findOne(id: string): Promise<ContractRequest> {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: {
        counterparty: true,
        contractType: true,
        specializedArea: true,
        parentContract: true,
        derivedInstruments: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Solicitud con id ${id} no encontrada.`);
    }

    return request;
  }

  async remove(id: string): Promise<void> {
    const request = await this.findOne(id);
    await this.requestRepo.softRemove(request);
  }

  /**
   * Calcula la ejecución financiera acumulada de un Contrato Marco sumando
   * todos sus contratos específicos y suplementos aprobados.
   */
  async getMasterContractExecutionSummary(masterContractId: string) {
    const master = await this.requestRepo.findOne({
      where: { id: masterContractId },
      relations: { derivedInstruments: true, counterparty: true },
    });

    if (!master) {
      throw new NotFoundException(`Contrato ${masterContractId} no encontrado.`);
    }

    const executedAmount = master.derivedInstruments.reduce((acc, child) => {
      return acc + (child.amount ?? 0);
    }, 0);

    return {
      masterCode: master.ecieInternalCode,
      counterparty: master.counterparty.officialName,
      amountType: master.amountType,
      derivedCount: master.derivedInstruments.length,
      totalExecutedAmount: Number(executedAmount.toFixed(2)),
      currency: master.currency,
    };
  }

  /**
   * Vincula de forma atómica e idempotente un acuerdo del Comité a una solicitud de contrato.
   */
  async linkResolutionToRequest(
    requestId: string,
    resolutionId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(ContractRequest, {
        where: { id: requestId },
        relations: { resolutions: true },
      });
      if (!request) {
        throw new NotFoundException(`Solicitud ${requestId} no encontrada.`);
      }

      const alreadyLinked = request.resolutions.some((r) => r.id === resolutionId);
      if (!alreadyLinked) {
        await manager
          .createQueryBuilder()
          .relation(ContractRequest, 'resolutions')
          .of(requestId)
          .add(resolutionId);
      }
    });
  }
}
