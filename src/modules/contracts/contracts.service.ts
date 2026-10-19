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
    await this.ensureNoContratoIsAvailable(createContractDto.noContrato);
    await this.ensureCompaniesAreValid(
      createContractDto.empresaOrigenId,
      createContractDto.empresaDestinoId,
    );
    this.ensureDatesAreValid(
      createContractDto.fechaInicio,
      createContractDto.fechaVencimiento,
    );

    const tipo =
      createContractDto.tipoRelacionContractual ?? ContractType.CONTRATO_PRINCIPAL;

    await this.ensureContratoPadreIsValid(tipo, createContractDto.contratoPadreId);

    if (createContractDto.actaCcId) {
      await this.ensureActaExists(createContractDto.actaCcId);
    }

    const contract = this.repository.create({
      noContrato: createContractDto.noContrato,
      tipoRelacionContractual: tipo,
      contratoPadreId: createContractDto.contratoPadreId ?? null,
      objeto: createContractDto.objeto,
      empresaOrigenId: createContractDto.empresaOrigenId,
      empresaDestinoId: createContractDto.empresaDestinoId,
      areaEspecializada: createContractDto.areaEspecializada ?? null,
      valor: createContractDto.valor ?? null,
      sinValorRefiere: createContractDto.sinValorRefiere ?? false,
      fechaEntradaUeb: createContractDto.fechaEntradaUeb ?? null,
      fechaEmisionDictamen: createContractDto.fechaEmisionDictamen ?? null,
      fechaInicio: createContractDto.fechaInicio,
      fechaVencimiento: createContractDto.fechaVencimiento ?? null,
      estadoAprobacionCc:
        createContractDto.estadoAprobacionCc ??
        ContractApprovalStatus.PENDIENTE_APROBACION_EMPRESA,
      actaCcId: createContractDto.actaCcId ?? null,
    });

    const saved = await this.repository.save(contract);
    return this.findOne(saved.id);
  }

  async findAll(
    query: FindContractsQueryDto,
  ): Promise<PaginatedResult<Contract>> {
    const qb = this.repository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.empresaOrigen', 'empresaOrigen')
      .leftJoinAndSelect('contract.empresaDestino', 'empresaDestino')
      .leftJoinAndSelect('contract.contratoPadre', 'contratoPadre')
      .leftJoinAndSelect('contract.actaCc', 'actaCc');

    if (query.search) {
      qb.andWhere(
        '(contract.noContrato LIKE :search OR contract.objeto LIKE :search OR contract.areaEspecializada LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.tipoRelacionContractual) {
      qb.andWhere('contract.tipoRelacionContractual = :tipo', {
        tipo: query.tipoRelacionContractual,
      });
    }

    if (query.contratoPadreId) {
      qb.andWhere('contract.contratoPadreId = :contratoPadreId', {
        contratoPadreId: query.contratoPadreId,
      });
    }

    if (query.estadoAprobacionCc) {
      qb.andWhere('contract.estadoAprobacionCc = :estado', {
        estado: query.estadoAprobacionCc,
      });
    }

    if (query.empresaOrigenId) {
      qb.andWhere('contract.empresaOrigenId = :empresaOrigenId', {
        empresaOrigenId: query.empresaOrigenId,
      });
    }

    if (query.empresaDestinoId) {
      qb.andWhere('contract.empresaDestinoId = :empresaDestinoId', {
        empresaDestinoId: query.empresaDestinoId,
      });
    }

    if (query.actaCcId) {
      qb.andWhere('contract.actaCcId = :actaCcId', {
        actaCcId: query.actaCcId,
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
        empresaOrigen: true,
        empresaDestino: true,
        contratoPadre: true,
        contratosHijos: true,
        actaCc: true,
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
      updateContractDto.noContrato &&
      updateContractDto.noContrato !== contract.noContrato
    ) {
      await this.ensureNoContratoIsAvailable(updateContractDto.noContrato, id);
      contract.noContrato = updateContractDto.noContrato;
    }

    const origenId =
      updateContractDto.empresaOrigenId ?? contract.empresaOrigenId;
    const destinoId =
      updateContractDto.empresaDestinoId ?? contract.empresaDestinoId;

    if (
      updateContractDto.empresaOrigenId !== undefined ||
      updateContractDto.empresaDestinoId !== undefined
    ) {
      await this.ensureCompaniesAreValid(origenId, destinoId);
      contract.empresaOrigenId = origenId;
      contract.empresaDestinoId = destinoId;
    }

    const fechaInicio = updateContractDto.fechaInicio ?? contract.fechaInicio;
    const fechaVencimiento =
      updateContractDto.fechaVencimiento !== undefined
        ? updateContractDto.fechaVencimiento
        : contract.fechaVencimiento;
    this.ensureDatesAreValid(fechaInicio, fechaVencimiento);

    if (updateContractDto.fechaInicio !== undefined) {
      contract.fechaInicio = updateContractDto.fechaInicio;
    }
    if (updateContractDto.fechaVencimiento !== undefined) {
      contract.fechaVencimiento = updateContractDto.fechaVencimiento;
    }

    const tipo =
      updateContractDto.tipoRelacionContractual ?? contract.tipoRelacionContractual;
    const padreId =
      updateContractDto.contratoPadreId !== undefined
        ? updateContractDto.contratoPadreId
        : contract.contratoPadreId;

    if (
      updateContractDto.tipoRelacionContractual !== undefined ||
      updateContractDto.contratoPadreId !== undefined
    ) {
      if (padreId === id) {
        throw new BadRequestException('Un contrato no puede ser su propio contrato padre.');
      }
      await this.ensureContratoPadreIsValid(tipo, padreId ?? undefined);
      contract.tipoRelacionContractual = tipo;
      contract.contratoPadreId = padreId;
    }

    if (updateContractDto.actaCcId !== undefined) {
      if (updateContractDto.actaCcId !== null) {
        await this.ensureActaExists(updateContractDto.actaCcId);
      }
      contract.actaCcId = updateContractDto.actaCcId;
    }

    if (updateContractDto.objeto !== undefined) {
      contract.objeto = updateContractDto.objeto;
    }

    if (updateContractDto.areaEspecializada !== undefined) {
      contract.areaEspecializada = updateContractDto.areaEspecializada;
    }

    if (updateContractDto.valor !== undefined) {
      contract.valor = updateContractDto.valor;
    }

    if (updateContractDto.sinValorRefiere !== undefined) {
      contract.sinValorRefiere = updateContractDto.sinValorRefiere;
    }

    if (updateContractDto.fechaEntradaUeb !== undefined) {
      contract.fechaEntradaUeb = updateContractDto.fechaEntradaUeb;
    }

    if (updateContractDto.fechaEmisionDictamen !== undefined) {
      contract.fechaEmisionDictamen = updateContractDto.fechaEmisionDictamen;
    }

    if (updateContractDto.estadoAprobacionCc !== undefined) {
      contract.estadoAprobacionCc = updateContractDto.estadoAprobacionCc;
    }

    await this.repository.save(contract);
    return this.findOne(id);
  }

  async changeStatus(
    id: number,
    dto: ChangeContractStatusDto,
  ): Promise<Contract> {
    const contract = await this.findOne(id);
    contract.estadoAprobacionCc = dto.estadoAprobacionCc;
    await this.repository.save(contract);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const contract = await this.findOne(id);

    const childrenCount = await this.repository.count({
      where: { contratoPadreId: id },
    });

    if (childrenCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el contrato porque tiene ${childrenCount} suplemento(s) o contrato(s) específico(s) asociado(s).`,
      );
    }

    await this.repository.remove(contract);
  }

  private async ensureNoContratoIsAvailable(
    noContrato: string,
    ignoreId?: number,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { noContrato },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(
        `Ya existe un contrato con el código o número ${noContrato}.`,
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

  private async ensureContratoPadreIsValid(
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
    fechaInicio: string,
    fechaVencimiento?: string | null,
  ): void {
    if (!fechaVencimiento) return;

    const start = new Date(fechaInicio);
    const end = new Date(fechaVencimiento);

    if (end < start) {
      throw new BadRequestException(
        'La fecha de vencimiento no puede ser anterior a la fecha de inicio.',
      );
    }
  }
}
