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
    await this.ensureTaxIdIsAvailable(createCompanyDto.taxId);

    if (createCompanyDto.parentCompanyId) {
      await this.ensureParentExists(createCompanyDto.parentCompanyId);
    }

    const company = this.repository.create({
      businessName: createCompanyDto.businessName,
      taxId: createCompanyDto.taxId,
      acronym: createCompanyDto.acronym ?? null,
      address: createCompanyDto.address ?? null,
      phone: createCompanyDto.phone ?? null,
      contactEmail: createCompanyDto.contactEmail ?? null,
      isUeb: createCompanyDto.isUeb ?? (createCompanyDto.parentCompanyId ? true : false),
      parentCompanyId: createCompanyDto.parentCompanyId ?? null,
    });

    const saved = await this.repository.save(company);
    return this.findOne(saved.id);
  }

  async findAll(
    query: FindCompaniesQueryDto,
  ): Promise<PaginatedResult<Company>> {
    const qb = this.repository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.parentCompany', 'parentCompany');

    if (query.search) {
      qb.andWhere(
        '(company.businessName LIKE :search OR company.taxId LIKE :search OR company.acronym LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.isUeb !== undefined) {
      qb.andWhere('company.isUeb = :isUeb', { isUeb: query.isUeb });
    }

    if (query.parentCompanyId !== undefined) {
      qb.andWhere('company.parentCompanyId = :parentCompanyId', {
        parentCompanyId: query.parentCompanyId,
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
        parentCompany: true,
        subsidiaries: true,
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
      updateCompanyDto.taxId &&
      updateCompanyDto.taxId !== company.taxId
    ) {
      await this.ensureTaxIdIsAvailable(updateCompanyDto.taxId, id);
      company.taxId = updateCompanyDto.taxId;
    }

    if (updateCompanyDto.businessName !== undefined) {
      company.businessName = updateCompanyDto.businessName;
    }

    if (updateCompanyDto.acronym !== undefined) {
      company.acronym = updateCompanyDto.acronym ?? null;
    }

    if (updateCompanyDto.address !== undefined) {
      company.address = updateCompanyDto.address;
    }

    if (updateCompanyDto.phone !== undefined) {
      company.phone = updateCompanyDto.phone;
    }

    if (updateCompanyDto.contactEmail !== undefined) {
      company.contactEmail = updateCompanyDto.contactEmail;
    }

    if (updateCompanyDto.isUeb !== undefined) {
      company.isUeb = updateCompanyDto.isUeb;
    }

    if (updateCompanyDto.parentCompanyId !== undefined) {
      if (updateCompanyDto.parentCompanyId === id) {
        throw new ConflictException('Una empresa no puede ser su propia empresa matriz.');
      }
      if (updateCompanyDto.parentCompanyId !== null) {
        await this.ensureParentExists(updateCompanyDto.parentCompanyId);
      }
      company.parentCompanyId = updateCompanyDto.parentCompanyId;
    }

    await this.repository.save(company);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const company = await this.findOne(id);

    const subsidiariesCount = await this.repository.count({
      where: { parentCompanyId: id },
    });
    if (subsidiariesCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la empresa porque tiene ${subsidiariesCount} UEB(s) asociada(s).`,
      );
    }

    const contracts = await this.dataSource.getRepository(Contract).count({
      where: [{ originCompanyId: id }, { destinationCompanyId: id }],
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

  private async ensureTaxIdIsAvailable(
    taxId: string,
    ignoreId?: number,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { taxId },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(
        `Ya existe una empresa con la identificación fiscal ${taxId}.`,
      );
    }
  }
}
