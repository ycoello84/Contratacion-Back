import { Column, Entity, Index, OneToMany } from 'typeorm';
import { type Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { LegalNature } from '../enums/contracting.enums.js';
import { ContractRequest } from './contract-request.entity.js';

/**
 * Representa a las entidades estatales, cooperativas, MIPYMES o TCP con las que
 * contrata la ECIE. Normaliza la columna "Entidad" evitando duplicidades por variantes
 * ortográficas (ej. "Ramón de Antilla" vs "Ramon de Antillas").
 */
@Entity('counterparties')
export class Counterparty extends BaseEntity {
  /** Razón social o nombre completo oficial de la contraparte */
  @Index({ unique: true })
  @Column({ name: 'official_name', type: 'varchar', length: 255 })
  officialName: string;

  /** Siglas o acrónimo institucional (Ej: "GEYSEL", "INEL", "ATI", "ECOT") */
  @Index()
  @Column({ name: 'acronym', type: 'varchar', length: 60, nullable: true })
  acronym: string | null;

  /** Organismo de la Administración Central del Estado u OSDE superior (Ej: "MINEM", "UNE") */
  @Column({ name: 'parent_agency', type: 'varchar', length: 150, nullable: true })
  parentAgency: string | null;

  /** Código REEUP (entidades estatales) o NIT (formas de gestión no estatal) */
  @Index({ unique: true })
  @Column({ name: 'tax_or_reeup_code', type: 'varchar', length: 50, nullable: true })
  taxOrReeupCode: string | null;

  /** Clasificación jurídica de la contraparte */
  @Column({
    name: 'legal_nature',
    type: 'enum',
    enum: LegalNature,
    default: LegalNature.STATE_ENTERPRISE,
  })
  legalNature: LegalNature;

  /** Indica si la contraparte está habilitada para nuevas contrataciones */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Solicitudes de contrato asociadas a esta contraparte */
  @OneToMany(() => ContractRequest, (request) => request.counterparty)
  contractRequests: Relation<ContractRequest>[];
}
