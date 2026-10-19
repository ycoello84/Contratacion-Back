import {
  BadRequestException,
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
import { Company } from '../companies/entities/company.entity.js';
import { Meeting } from '../meetings/entities/meeting.entity.js';
import { ChangeContractStatusDto } from './dto/change-contract-status.dto.js';
import { CreateContractDto } from './dto/create-contract.dto.js';
import { FindContractsQueryDto } from './dto/find-contracts-query.dto.js';
import { UpdateContractDto } from './dto/update-contract.dto.js';
import { Contract } from './entities/contract.entity.js';
import { ContractApprovalStatus } from './entities/contract-approval-status.enum.js';
import { ContractType } from './entities/contract-type.enum.js';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly repository: Repository<Contract>,
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(Meeting)
    private readonly meetingsRepository: Repository<Meeting>,
  ) {}

  async create(createContractDto: CreateContractDto): Promise<Contract> {
    await this.ensureContractNumberIsAvailable(
      createContractDto.contractNumber,
    );
    await this.ensureCompaniesAreValid(
      createContractDto.originCompanyId,
      createContractDto.destinationCompanyId,
    );
    this.ensureDatesAreValid(
      createContractDto.startDate,
      createContractDto.expirationDate,
    );

    const tipo =
      createContractDto.contractRelationshipType ??
      ContractType.CONTRATO_PRINCIPAL;

    await this.ensureParentContractIsValid(tipo, createContractDto.parentContractId);

    if (createContractDto.actCcId) {
      await this.ensureActaExists(createContractDto.actCcId);
    }

    const contract = this.repository.create({
      contractNumber: createContractDto.contractNumber,
      contractRelationshipType: tipo,
      parentContractId: createContractDto.parentContractId ?? null,
      object: createContractDto.object,
      originCompanyId: createContractDto.originCompanyId,
      destinationCompanyId: createContractDto.destinationCompanyId,
      specializedArea: createContractDto.specializedArea ?? null,
      value: createContractDto.value ?? null,
      noValueReference: createContractDto.noValueReference ?? false,
      uebEntryDate: createContractDto.uebEntryDate ?? null,
      opinionIssueDate: createContractDto.opinionIssueDate ?? null,
      startDate: createContractDto.startDate,
      expirationDate: createContractDto.expirationDate ?? null,
      ccApprovalStatus:
        createContractDto.ccApprovalStatus ??
        ContractApprovalStatus.PENDIENTE_APROBACION_EMPRESA,
      actCcId: createContractDto.actCcId ?? null,
    });

    const saved = await this.repository.save(contract);
    return this.findOne(saved.id);
  }

  async findAll(
    query: FindContractsQueryDto,
  ): Promise<PaginatedResult<Contract>> {
    const qb = this.repository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.originCompany', 'originCompany')
      .leftJoinAndSelect('contract.destinationCompany', 'destinationCompany')
      .leftJoinAndSelect('contract.parentContract', 'parentContract')
      .leftJoinAndSelect('contract.actCc', 'actCc');

    if (query.search) {
      qb.andWhere(
        '(contract.contractNumber LIKE :search OR contract.object LIKE :search OR contract.specializedArea LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.contractRelationshipType) {
      qb.andWhere('contract.contractRelationshipType = :tipo', {
        tipo: query.contractRelationshipType,
      });
    }

    if (query.parentContractId) {
      qb.andWhere('contract.parentContractId = :parentContractId', {
        parentContractId: query.parentContractId,
      });
    }

    if (query.ccApprovalStatus) {
      qb.andWhere('contract.ccApprovalStatus = :estado', {
        estado: query.ccApprovalStatus,
      });
    }

    if (query.originCompanyId) {
      qb.andWhere('contract.originCompanyId = :originCompanyId', {
        originCompanyId: query.originCompanyId,
      });
    }

    if (query.destinationCompanyId) {
      qb.andWhere('contract.destinationCompanyId = :destinationCompanyId', {
        destinationCompanyId: query.destinationCompanyId,
      });
    }

    if (query.actCcId) {
      qb.andWhere('contract.actCcId = :actCcId', {
        actCcId: query.actCcId,
      });
    }

    const [contracts, total] = await qb
      .orderBy('contract.createdAt', 'DESC')
      .take(query.limit)
      .skip(query.skip)
      .getManyAndCount();

    return buildPaginatedResult(contracts, total, query.page, query.limit);
  }

  async findOne(id: number): Promise<Contract> {
    const contract = await this.repository.findOne({
      where: { id },
      relations: {
        originCompany: true,
        destinationCompany: true,
        parentContract: true,
        childContracts: true,
        actCc: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contrato con id ${id} no encontrado.`);
    }

    return contract;
  }

  async update(
    id: number,
    updateContractDto: UpdateContractDto,
  ): Promise<Contract> {
    const contract = await this.findOne(id);

    if (
      updateContractDto.contractNumber &&
      updateContractDto.contractNumber !== contract.contractNumber
    ) {
      await this.ensureContractNumberIsAvailable(
        updateContractDto.contractNumber,
        id,
      );
      contract.contractNumber = updateContractDto.contractNumber;
    }

    const origenId =
      updateContractDto.originCompanyId ?? contract.originCompanyId;
    const destinoId =
      updateContractDto.destinationCompanyId ?? contract.destinationCompanyId;

    if (
      updateContractDto.originCompanyId !== undefined ||
      updateContractDto.destinationCompanyId !== undefined
    ) {
      await this.ensureCompaniesAreValid(origenId, destinoId);
      contract.originCompanyId = origenId;
      contract.destinationCompanyId = destinoId;
    }

    const startDate = updateContractDto.startDate ?? contract.startDate;
    const expirationDate =
      updateContractDto.expirationDate !== undefined
        ? updateContractDto.expirationDate
        : contract.expirationDate;
    this.ensureDatesAreValid(startDate, expirationDate);

    if (updateContractDto.startDate !== undefined) {
      contract.startDate = updateContractDto.startDate;
    }
    if (updateContractDto.expirationDate !== undefined) {
      contract.expirationDate = updateContractDto.expirationDate;
    }

    const tipo =
      updateContractDto.contractRelationshipType ??
      contract.contractRelationshipType;
    const padreId =
      updateContractDto.parentContractId !== undefined
        ? updateContractDto.parentContractId
        : contract.parentContractId;

    if (
      updateContractDto.contractRelationshipType !== undefined ||
      updateContractDto.parentContractId !== undefined
    ) {
      if (padreId === id) {
        throw new BadRequestException(
          'Un contrato no puede ser su propio contrato padre.',
        );
      }
      await this.ensureParentContractIsValid(tipo, padreId ?? undefined);
      contract.contractRelationshipType = tipo;
      contract.parentContractId = padreId;
    }

    if (updateContractDto.actCcId !== undefined) {
      if (updateContractDto.actCcId !== null) {
        await this.ensureActaExists(updateContractDto.actCcId);
      }
      contract.actCcId = updateContractDto.actCcId;
    }

    if (updateContractDto.object !== undefined) {
      contract.object = updateContractDto.object;
    }

    if (updateContractDto.specializedArea !== undefined) {
      contract.specializedArea = updateContractDto.specializedArea;
    }

    if (updateContractDto.value !== undefined) {
      contract.value = updateContractDto.value;
    }

    if (updateContractDto.noValueReference !== undefined) {
      contract.noValueReference = updateContractDto.noValueReference;
    }

    if (updateContractDto.uebEntryDate !== undefined) {
      contract.uebEntryDate = updateContractDto.uebEntryDate;
    }

    if (updateContractDto.opinionIssueDate !== undefined) {
      contract.opinionIssueDate = updateContractDto.opinionIssueDate;
    }

    if (updateContractDto.ccApprovalStatus !== undefined) {
      contract.ccApprovalStatus = updateContractDto.ccApprovalStatus;
    }

    await this.repository.save(contract);
    return this.findOne(id);
  }

  async changeStatus(
    id: number,
    dto: ChangeContractStatusDto,
  ): Promise<Contract> {
    const contract = await this.findOne(id);
    contract.ccApprovalStatus = dto.ccApprovalStatus;
    await this.repository.save(contract);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const contract = await this.findOne(id);

    const childrenCount = await this.repository.count({
      where: { parentContractId: id },
    });

    if (childrenCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el contrato porque tiene ${childrenCount} suplemento(s) o contrato(s) específico(s) asociado(s).`,
      );
    }

    await this.repository.remove(contract);
  }

  private async ensureContractNumberIsAvailable(
    contractNumber: string,
    ignoreId?: number,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { contractNumber },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(
        `Ya existe un contrato con el código o número ${contractNumber}.`,
      );
    }
  }

  private async ensureCompaniesAreValid(
    origenId: number,
    destinoId: number,
  ): Promise<void> {
    if (origenId === destinoId) {
      throw new BadRequestException(
        'La empresa origen y destino no pueden ser la misma entidad.',
      );
    }

    const [origen, destino] = await Promise.all([
      this.companiesRepository.findOne({ where: { id: origenId } }),
      this.companiesRepository.findOne({ where: { id: destinoId } }),
    ]);

    if (!origen) {
      throw new NotFoundException(
        `Empresa origen con id ${origenId} no encontrada.`,
      );
    }

    if (!destino) {
      throw new NotFoundException(
        `Empresa destino con id ${destinoId} no encontrada.`,
      );
    }
  }

  private async ensureParentContractIsValid(
    tipo: ContractType,
    padreId?: number | null,
  ): Promise<void> {
    if (tipo === ContractType.SUPLEMENTO || tipo === ContractType.CONTRATO_ESPECIFICO) {
      if (!padreId) {
        throw new BadRequestException(
          `Un ${tipo} debe especificar un contrato padre (contrato_padre_id).`,
        );
      }
      const padre = await this.repository.findOne({ where: { id: padreId } });
      if (!padre) {
        throw new NotFoundException(
          `Contrato padre con id ${padreId} no encontrado.`,
        );
      }
    }
  }

  private async ensureActaExists(actaId: number): Promise<void> {
    const acta = await this.meetingsRepository.findOne({ where: { id: actaId } });
    if (!acta) {
      throw new NotFoundException(`Acta del Comité con id ${actaId} no encontrada.`);
    }
  }

  private ensureDatesAreValid(
    startDate: string,
    expirationDate?: string | null,
  ): void {
    if (!expirationDate) return;

    const start = new Date(startDate);
    const end = new Date(expirationDate);

    if (end < start) {
      throw new BadRequestException(
        'La fecha de vencimiento no puede ser anterior a la fecha de inicio.',
      );
    }
  }
}
