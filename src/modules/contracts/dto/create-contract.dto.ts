import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ContractApprovalStatus } from '../entities/contract-approval-status.enum.js';
import { ContractType } from '../entities/contract-type.enum.js';

export class CreateContractDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  noContrato: string;

  @IsOptional()
  @IsEnum(ContractType)
  tipoRelacionContractual?: ContractType;

  @IsOptional()
  @IsInt()
  @Min(1)
  contratoPadreId?: number;

  @IsString()
  @IsNotEmpty()
  objeto: string;

  @IsInt()
  @Min(1)
  empresaOrigenId: number;

  @IsInt()
  @Min(1)
  empresaDestinoId: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  areaEspecializada?: string;

  @IsOptional()
  @IsNumberString(
    {},
    { message: 'El valor debe ser una cadena numérica o decimal válida.' },
  )
  valor?: string;

  @IsOptional()
  @IsBoolean()
  sinValorRefiere?: boolean;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de entrada a la UEB debe tener un formato válido.' },
  )
  fechaEntradaUeb?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de emisión del dictamen debe tener un formato válido.' },
  )
  fechaEmisionDictamen?: string;

  @IsDateString({}, { message: 'La fecha de inicio debe tener un formato válido.' })
  fechaInicio: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de vencimiento debe tener un formato válido.' },
  )
  fechaVencimiento?: string;

  @IsOptional()
  @IsEnum(ContractApprovalStatus, {
    message: 'El estado de aprobación del CC no es válido.',
  })
  estadoAprobacionCc?: ContractApprovalStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  actaCcId?: number;
}
