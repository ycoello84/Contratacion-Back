import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { ContractApprovalStatus } from '../entities/contract-approval-status.enum.js';
import { ContractType } from '../entities/contract-type.enum.js';

export class FindContractsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(ContractType)
  tipoRelacionContractual?: ContractType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  contratoPadreId?: number;

  @IsOptional()
  @IsEnum(ContractApprovalStatus)
  estadoAprobacionCc?: ContractApprovalStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  empresaOrigenId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  empresaDestinoId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  actaCcId?: number;
}
