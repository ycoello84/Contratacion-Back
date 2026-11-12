import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AmountType,
  EconomyArchiveStatus,
  InstrumentCategory,
  RequestStatus,
  ValidityType,
} from '../enums/contracting.enums.js';

/**
 * DTO validado para la creación de una solicitud de contrato.
 * Garantiza integridad de tipos antes de alcanzar la capa de persistencia.
 */
export class CreateContractRequestDto {
  @IsInt()
  @Min(2000)
  registrationYear: number;

  @IsInt()
  @Min(1)
  consecutiveNumber: number;

  @IsString()
  @MaxLength(50)
  ecieInternalCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  counterpartyContractNumber?: string;

  @IsEnum(InstrumentCategory)
  instrumentCategory: InstrumentCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  subInstrumentNumber?: number;

  @IsOptional()
  @IsUUID()
  parentContractId?: string;

  @IsUUID()
  counterpartyId: string;

  @IsUUID()
  contractTypeId: string;

  @IsUUID()
  specializedAreaId: string;

  @IsString()
  subject: string;

  @IsDateString()
  uebEntryDate: string;

  @IsOptional()
  @IsDateString()
  legalOpinionDate?: string;

  @IsOptional()
  @IsDateString()
  signatureDate?: string;

  @IsEnum(AmountType)
  amountType: AmountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsEnum(ValidityType)
  validityType: ValidityType;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  validityDescription?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  approvalStatus?: RequestStatus;

  @IsOptional()
  @IsEnum(EconomyArchiveStatus)
  economyArchiveStatus?: EconomyArchiveStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}
