import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
} from '../../common/dto/pagination.dto.js';
import { Contract } from '../contracts/entities/contract.entity.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { FindCompaniesQueryDto } from './dto/find-companies-query.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { Company } from './entities/company.entity.js';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly repository: Repository<Company>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    await this.ensureIdentificacionIsAvailable(
      createCompanyDto.identificacionFiscal,
    );

    if (createCompanyDto.parentEmpresaId) {
      await this.ensureParentExists(createCompanyDto.parentEmpresaId);
    }

    const company = this.repository.create({
      razonSocial: createCompanyDto.razonSocial,
      identificacionFiscal: createCompanyDto.identificacionFiscal,
      siglas: createCompanyDto.siglas ?? null,
      direccion: createCompanyDto.direccion ?? null,
      telefono: createCompanyDto.telefono ?? null,
      emailContacto: createCompanyDto.emailContacto ?? null,
      esUeb: createCompanyDto.esUeb ?? (createCompanyDto.parentEmpresaId ? true : false),
      parentEmpresaId: createCompanyDto.parentEmpresaId ?? null,
    });

    const saved = await this.repository.save(company);
    return this.findOne(saved.id);
  }

  async findAll(
    query: FindCompaniesQueryDto,
  ): Promise<PaginatedResult<Company>> {
    const qb = this.repository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.parentEmpresa', 'parentEmpresa');

    if (query.search) {
      qb.andWhere(
        '(company.razonSocial LIKE :search OR company.identificacionFiscal LIKE :search OR company.siglas LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.esUeb !== undefined) {
      qb.andWhere('company.esUeb = :esUeb', { esUeb: query.esUeb });
    }

    if (query.parentEmpresaId !== undefined) {
      qb.andWhere('company.parentEmpresaId = :parentEmpresaId', {
        parentEmpresaId: query.parentEmpresaId,
      });
    }

    const [companies, total] = await qb
      .orderBy('company.createdAt', 'DESC')
      .take(query.limit)
      .skip(query.skip)
      .getManyAndCount();

    return buildPaginatedResult(companies, total, query.page, query.limit);
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.repository.findOne({
      where: { id },
      relations: {
        parentEmpresa: true,
        uebs: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Empresa con id ${id} no encontrada.`);
    }

    return company;
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);

    if (
      updateCompanyDto.identificacionFiscal &&
      updateCompanyDto.identificacionFiscal !== company.identificacionFiscal
    ) {
      await this.ensureIdentificacionIsAvailable(
        updateCompanyDto.identificacionFiscal,
        id,
      );
      company.identificacionFiscal = updateCompanyDto.identificacionFiscal;
    }

    if (updateCompanyDto.razonSocial !== undefined) {
      company.razonSocial = updateCompanyDto.razonSocial;
    }

    if (updateCompanyDto.siglas !== undefined) {
      company.siglas = updateCompanyDto.siglas ?? null;
    }

    if (updateCompanyDto.direccion !== undefined) {
      company.direccion = updateCompanyDto.direccion;
    }

    if (updateCompanyDto.telefono !== undefined) {
      company.telefono = updateCompanyDto.telefono;
    }

    if (updateCompanyDto.emailContacto !== undefined) {
      company.emailContacto = updateCompanyDto.emailContacto;
    }

    if (updateCompanyDto.esUeb !== undefined) {
      company.esUeb = updateCompanyDto.esUeb;
    }

    if (updateCompanyDto.parentEmpresaId !== undefined) {
      if (updateCompanyDto.parentEmpresaId === id) {
        throw new ConflictException('Una empresa no puede ser su propia empresa matriz.');
      }
      if (updateCompanyDto.parentEmpresaId !== null) {
        await this.ensureParentExists(updateCompanyDto.parentEmpresaId);
      }
      company.parentEmpresaId = updateCompanyDto.parentEmpresaId;
    }

    await this.repository.save(company);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const company = await this.findOne(id);

    const uebsCount = await this.repository.count({
      where: { parentEmpresaId: id },
    });
    if (uebsCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la empresa porque tiene ${uebsCount} UEB(s) asociada(s).`,
      );
    }

    const contracts = await this.dataSource.getRepository(Contract).count({
      where: [{ empresaOrigenId: id }, { empresaDestinoId: id }],
    });

    if (contracts > 0) {
      throw new ConflictException(
        `No se puede eliminar la empresa porque tiene ${contracts} contrato(s) asociado(s).`,
      );
    }

    await this.repository.remove(company);
  }

  private async ensureParentExists(parentId: number): Promise<void> {
    const parent = await this.repository.findOne({ where: { id: parentId } });
    if (!parent) {
      throw new NotFoundException(`Empresa matriz con id ${parentId} no encontrada.`);
    }
  }

  private async ensureIdentificacionIsAvailable(
    identificacionFiscal: string,
    ignoreId?: number,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { identificacionFiscal },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(
        `Ya existe una empresa con la identificación fiscal ${identificacionFiscal}.`,
      );
    }
  }
}
