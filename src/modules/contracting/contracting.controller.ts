import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ContractRequestService } from './services/contract-request.service.js';
import { CreateContractRequestDto } from './dto/create-contract-request.dto.js';
import { FindContractRequestsQueryDto } from './dto/find-contract-requests-query.dto.js';
import { UpdateContractRequestDto } from './dto/update-contract-request.dto.js';
import { ContractRequest } from './entities/contract-request.entity.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../modules/users/entities/user-role.enum.js';
import { REQUEST_STATUS_METADATA } from './enums/contracting.enums.js';

@Controller('contracting')
export class ContractingController {
  constructor(private readonly service: ContractRequestService) {}

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Post('requests')
  create(@Body() dto: CreateContractRequestDto): Promise<ContractRequest> {
    return this.service.create(dto);
  }

  @Get('requests')
  findAll(@Query() query: FindContractRequestsQueryDto) {
    return this.service.findAll(query);
  }

  @Get('requests/:id')
  findOne(@Param('id') id: string): Promise<ContractRequest> {
    return this.service.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Patch('requests/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractRequestDto,
  ): Promise<ContractRequest> {
    return this.service.update(id, dto);
  }

  @Get('requests/:id/execution-summary')
  getExecutionSummary(@Param('id') id: string) {
    return this.service.getMasterContractExecutionSummary(id);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Post('requests/:id/link-resolution/:resolutionId')
  @HttpCode(HttpStatus.OK)
  linkResolution(
    @Param('id') id: string,
    @Param('resolutionId') resolutionId: string,
  ): Promise<void> {
    return this.service.linkResolutionToRequest(id, resolutionId);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Delete('requests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }

  @Get('status-metadata')
  statusMetadata() {
    return REQUEST_STATUS_METADATA;
  }

  @Get('counterparties')
  findAllCounterparties() {
    return this.service.findAllCounterparties();
  }

  @Get('contract-types')
  findAllContractTypes() {
    return this.service.findAllContractTypes();
  }

  @Get('specialized-areas')
  findAllSpecializedAreas() {
    return this.service.findAllSpecializedAreas();
  }
}
