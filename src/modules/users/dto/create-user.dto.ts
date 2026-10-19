import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user-role.enum.js';

export class CreateUserDto {
  @IsEmail({}, { message: 'El email debe tener un formato válido.' })
  @MaxLength(180)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede superar los 72 caracteres.' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nombre: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN, GESTOR o LECTOR.' })
  rol: UserRole = UserRole.LECTOR;

  @IsOptional()
  @IsBoolean()
  activo: boolean = true;
}
