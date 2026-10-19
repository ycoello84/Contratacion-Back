import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  identificacionFiscal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  siglas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email de contacto debe tener un formato válido.' })
  @MaxLength(180)
  emailContacto?: string;

  @IsOptional()
  @IsBoolean()
  esUeb?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentEmpresaId?: number | null;
}

