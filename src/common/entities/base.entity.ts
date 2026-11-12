import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Entidad base abstracta para todo el dominio.
 * Provee clave primaria UUID v4, marcas de tiempo con precisión de microsegundos
 * y soporte nativo para borrado lógico (Soft Delete) exigido en auditorías institucionales.
 */
export abstract class BaseEntity {
  /** Identificador único universal (UUID v4) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Fecha y hora de creación del registro en UTC */
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  /** Fecha y hora de última actualización en UTC */
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;

  /** Fecha de eliminación lógica; si es null, el registro permanece activo */
  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6, nullable: true })
  deletedAt: Date | null;
}
