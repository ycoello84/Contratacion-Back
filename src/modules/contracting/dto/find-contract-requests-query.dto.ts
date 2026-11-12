import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import {
  AmountType,
  InstrumentCategory,
  RequestStatus,
  ValidityType,
} from '../enums/contracting.enums.js';

export class FindContractRequestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  counterpartyId?: string;

  @IsOptional()
  @IsUUID()
  contractTypeId?: string;

  @IsOptional()
  @IsUUID()
  specializedAreaId?: string;

  @IsOptional()
  @IsEnum(InstrumentCategory)
  instrumentCategory?: InstrumentCategory;

  @IsOptional()
  @IsEnum(RequestStatus)
  approvalStatus?: RequestStatus;

  @IsOptional()
  @IsEnum(AmountType)
  amountType?: AmountType;

  @IsOptional()
  @IsEnum(ValidityType)
  validityType?: ValidityType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  registrationYear?: number;
}
