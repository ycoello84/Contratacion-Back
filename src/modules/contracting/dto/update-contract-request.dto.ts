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
 * DTO validado para la actualización parcial de una solicitud de contrato.
 * Todos los campos son opcionales; solo se persisten los enviados.
 */
export class UpdateContractRequestDto {
  @IsOptional()
  @IsInt()
  @Min(2000)
  registrationYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  consecutiveNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ecieInternalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  counterpartyContractNumber?: string;

  @IsOptional()
  @IsEnum(InstrumentCategory)
  instrumentCategory?: InstrumentCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  subInstrumentNumber?: number;

  @IsOptional()
  @IsUUID()
  parentContractId?: string;

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
  @IsString()
  subject?: string;

  @IsOptional()
  @IsDateString()
  uebEntryDate?: string;

  @IsOptional()
  @IsDateString()
  legalOpinionDate?: string;

  @IsOptional()
  @IsDateString()
  signatureDate?: string;

  @IsOptional()
  @IsEnum(AmountType)
  amountType?: AmountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsEnum(ValidityType)
  validityType?: ValidityType;

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
