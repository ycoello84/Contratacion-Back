import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El email debe tener un formato válido.' })
  @MaxLength(180)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @IsString()
  @MinLength(1, { message: 'La contraseña es obligatoria.' })
  @MaxLength(72)
  password: string;
}
