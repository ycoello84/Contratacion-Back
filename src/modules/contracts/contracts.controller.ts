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
import { ContractsService } from './contracts.service.js';
import { ChangeContractStatusDto } from './dto/change-contract-status.dto.js';
import { CreateContractDto } from './dto/create-contract.dto.js';
import { FindContractsQueryDto } from './dto/find-contracts-query.dto.js';
import { UpdateContractDto } from './dto/update-contract.dto.js';
import { Contract } from './entities/contract.entity.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user-role.enum.js';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Post()
  create(@Body() createContractDto: CreateContractDto): Promise<Contract> {
    return this.contractsService.create(createContractDto);
  }

  @Get()
  findAll(@Query() query: FindContractsQueryDto) {
    return this.contractsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Contract> {
    return this.contractsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContractDto: UpdateContractDto,
  ): Promise<Contract> {
    return this.contractsService.update(id, updateContractDto);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Patch(':id/estado')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeContractStatusDto: ChangeContractStatusDto,
  ): Promise<Contract> {
    return this.contractsService.changeStatus(id, changeContractStatusDto);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.contractsService.remove(id);
  }
}
