import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AgreementStatus } from '../entities/agreement-status.enum.js';

export class UpdateAgreementDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  agreementNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  actCcId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  contractId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  point?: string | null;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  responsibleId?: number;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha límite de cumplimiento debe tener un formato válido.' },
  )
  complianceDate?: string;

  @IsOptional()
  @IsEnum(AgreementStatus, {
    message: 'El estado de cumplimiento debe ser CUMPLIDO, NO_CUMPLIDO o PENDIENTE.',
  })
  complianceStatus?: AgreementStatus;
}
