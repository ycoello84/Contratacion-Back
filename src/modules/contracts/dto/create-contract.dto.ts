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
  contractNumber: string;

  @IsOptional()
  @IsEnum(ContractType)
  contractRelationshipType?: ContractType;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentContractId?: number;

  @IsString()
  @IsNotEmpty()
  object: string;

  @IsInt()
  @Min(1)
  originCompanyId: number;

  @IsInt()
  @Min(1)
  destinationCompanyId: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  specializedArea?: string;

  @IsOptional()
  @IsNumberString(
    {},
    { message: 'El valor debe ser una cadena numérica o decimal válida.' },
  )
  value?: string;

  @IsOptional()
  @IsBoolean()
  noValueReference?: boolean;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de entrada a la UEB debe tener un formato válido.' },
  )
  uebEntryDate?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de emisión del dictamen debe tener un formato válido.' },
  )
  opinionIssueDate?: string;

  @IsDateString({}, { message: 'La fecha de inicio debe tener un formato válido.' })
  startDate: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de vencimiento debe tener un formato válido.' },
  )
  expirationDate?: string;

  @IsOptional()
  @IsEnum(ContractApprovalStatus, {
    message: 'El estado de aprobación del CC no es válido.',
  })
  ccApprovalStatus?: ContractApprovalStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  actCcId?: number;
}
