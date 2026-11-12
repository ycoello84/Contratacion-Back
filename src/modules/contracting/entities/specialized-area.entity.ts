import { Column, Entity, Index, OneToMany } from 'typeorm';
import { type Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { ContractRequest } from './contract-request.entity.js';

/**
 * Catálogo de áreas internas de la ECIE responsables de promover y administrar
 * los contratos (Ej: Construcción e Inversiones, Equipo y Transporte, CO Transmisión).
 */
@Entity('specialized_areas')
export class SpecializedArea extends BaseEntity {
  /** Código interno corto del área (Ej: "CONST_INV", "EQ_TRANSP") */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  code: string;

  /** Nombre oficial del área especializada */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  /** Indica si el área está vigente en el organigrama */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Solicitudes tramitadas por esta área */
  @OneToMany(() => ContractRequest, (request) => request.specializedArea)
  contractRequests: Relation<ContractRequest>[];
}
