import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  NODE_ENV: string = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  API_PREFIX: string = 'api';

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string = 'contratacion-dev-secret';

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN: string = '1h';

  @IsString()
  @IsNotEmpty()
  DB_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 3307;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string = 'root';

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string = 'rootpassword';

  @IsString()
  @IsNotEmpty()
  DB_DATABASE: string = 'contratacion_db';

  @IsBoolean()
  DB_SYNCHRONIZE: boolean = true;

  @IsBoolean()
  DB_LOGGING: boolean = false;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string = '*';

  @IsString()
  @IsNotEmpty()
  SEED_ADMIN_EMAIL: string = 'admin@contratacion.local';

  @IsString()
  @IsNotEmpty()
  SEED_ADMIN_PASSWORD: string = 'Admin123!';

  @IsString()
  @IsNotEmpty()
  SEED_ADMIN_NOMBRE: string = 'Administrador';

  @IsIn(['development', 'test', 'production'])
  APP_ENV: string = 'development';
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Configuración de entorno inválida: ${details}`);
  }

  return validatedConfig;
}
