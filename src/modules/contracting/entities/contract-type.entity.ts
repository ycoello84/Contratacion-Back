import { Column, Entity, Index, OneToMany } from 'typeorm';
import { type Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { ContractRequest } from './contract-request.entity.js';

/**
 * Catálogo de tipologías jurídicas de contratación
 * (Prestación de Servicios, Compraventa, Ejecución de Obra, Transportación, etc.).
 */
@Entity('contract_types')
export class ContractType extends BaseEntity {
  /** Código normalizado en mayúsculas (Ej: "PRESTACION_SERVICIOS") */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  /** Nombre descriptivo del tipo de contrato */
  @Column({ type: 'varchar', length: 150 })
  name: string;

  /** Descripción legal opcional */
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  /** Indica si el tipo de contrato está activo */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Solicitudes clasificadas bajo este tipo */
  @OneToMany(() => ContractRequest, (request) => request.contractType)
  contractRequests: Relation<ContractRequest>[];
}
