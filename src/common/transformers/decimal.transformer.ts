import { ValueTransformer } from 'typeorm';

/**
 * Transformador bidireccional entre DECIMAL de MySQL y number de TypeScript.
 * Evita que los montos financieros lleguen como strings al dominio y previene
 * imprecisiones de punto flotante al persistir en base de datos.
 */
export class DecimalColumnTransformer implements ValueTransformer {
  /** Convierte de TypeScript a MySQL */
  to(data?: number | null): number | null {
    return data ?? null;
  }

  /** Convierte de MySQL (string) a TypeScript (number) */
  from(data?: string | null): number | null {
    if (data === null || data === undefined) return null;
    const parsed = parseFloat(data);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
