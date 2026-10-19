export interface JwtConfig {
  secret: string;
  /** Tiempo de expiración del token expresado en segundos. */
  expiresIn: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
}

export interface CorsConfig {
  origin: string[];
}

export interface SeedConfig {
  adminEmail: string;
  adminPassword: string;
  adminNombre: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  jwt: JwtConfig;
  database: DatabaseConfig;
  cors: CorsConfig;
  seed: SeedConfig;
}

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const UNITS_IN_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/**
 * Convierte una duración ("1h", "30m", "45") a segundos.
 */
export const parseDurationToSeconds = (
  value: string | undefined,
  fallback: number,
): number => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  const match = /^(\d+)\s*([smhd])?$/.exec(normalized);

  if (!match) {
    return fallback;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 's';

  return amount * (UNITS_IN_SECONDS[unit] ?? 1);
};

export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toNumber(process.env.PORT, 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'contratacion-dev-secret',
    expiresIn: parseDurationToSeconds(process.env.JWT_EXPIRES_IN, 3600),
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: toNumber(process.env.DB_PORT, 3307),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? 'rootpassword',
    database: process.env.DB_DATABASE ?? 'contratacion_db',
    synchronize: toBoolean(process.env.DB_SYNCHRONIZE, true),
    logging: toBoolean(process.env.DB_LOGGING, false),
  },
  cors: {
    origin: (process.env.CORS_ORIGIN ?? '*')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@contratacion.local',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    adminNombre: process.env.SEED_ADMIN_NOMBRE ?? 'Administrador',
  },
});

export default configuration;
