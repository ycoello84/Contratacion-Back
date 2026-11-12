import { DataSourceOptions } from 'typeorm';

/**
 * Configuración centralizada de conexión a MySQL 8+.
 * - charset 'utf8mb4': soporte completo para tildes, eñes y caracteres especiales.
 * - timezone 'Z': estandarización de fechas en UTC.
 * - synchronize: desactivado en producción para exigir migraciones versionadas.
 */
export const getTypeOrmConfig = (): DataSourceOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3307),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? 'rootpassword',
  database: process.env.DB_DATABASE ?? 'contratacion_db',
  charset: 'utf8mb4',
  timezone: 'Z',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  extra: {
    connectionLimit: 15,
  },
});
