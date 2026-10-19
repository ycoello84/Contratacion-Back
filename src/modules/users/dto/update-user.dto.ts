import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user-role.enum.js';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido.' })
  @MaxLength(180)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede superar los 72 caracteres.' })
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nombre?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN, GESTOR o LECTOR.' })
  rol?: UserRole;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
