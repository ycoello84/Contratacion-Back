import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { FindCompaniesQueryDto } from './dto/find-companies-query.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { Company } from './entities/company.entity.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user-role.enum.js';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto): Promise<Company> {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  findAll(@Query() query: FindCompaniesQueryDto) {
    return this.companiesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Company> {
    return this.companiesService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.companiesService.remove(id);
  }
}
