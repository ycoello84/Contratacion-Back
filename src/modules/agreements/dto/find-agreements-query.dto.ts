import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { AgreementStatus } from '../entities/agreement-status.enum.js';

export class FindAgreementsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  actaCcId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  contratoId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  responsableId?: number;

  @IsOptional()
  @IsEnum(AgreementStatus)
  estadoCumplimiento?: AgreementStatus;
}
