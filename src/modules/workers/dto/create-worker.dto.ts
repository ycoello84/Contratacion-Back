import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorkerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nombreCompleto: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cargo?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido.' })
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  empresaId?: number;

  @IsOptional()
  @IsBoolean()
  esMiembroCc?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  cargoCc?: string;
}
