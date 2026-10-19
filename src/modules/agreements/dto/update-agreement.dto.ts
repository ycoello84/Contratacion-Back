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
  numeroAcuerdo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  actaCcId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  contratoId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  punto?: string | null;

  @IsOptional()
  @IsString()
  detalle?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  responsableId?: number;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha límite de cumplimiento debe tener un formato válido.' },
  )
  fechaCumplimiento?: string;

  @IsOptional()
  @IsEnum(AgreementStatus, {
    message: 'El estado de cumplimiento debe ser CUMPLIDO, NO_CUMPLIDO o PENDIENTE.',
  })
  estadoCumplimiento?: AgreementStatus;
}
