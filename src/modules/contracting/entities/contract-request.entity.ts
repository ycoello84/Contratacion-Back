import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { type Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { DecimalColumnTransformer } from '../../../common/transformers/decimal.transformer.js';
import {
  AmountType,
  EconomyArchiveStatus,
  InstrumentCategory,
  RequestStatus,
  ValidityType,
} from '../enums/contracting.enums.js';
import { CommitteeMinute } from './committee-minute.entity.js';
import { CommitteeResolution } from './committee-resolution.entity.js';
import { ContractType } from './contract-type.entity.js';
import { Counterparty } from './counterparty.entity.js';
import { SpecializedArea } from './specialized-area.entity.js';

/**
 * Entidad nuclear del sistema. Modela cada fila de la hoja "Registro del CC".
 * Soporta jerarquía padre-hijo (Marco -> Específico / Suplemento), valores heterogéneos,
 * vigencias flexibles y trazabilidad completa con actas y acuerdos del Comité.
 */
@Entity('contract_requests')
@Index(['registrationYear', 'consecutiveNumber'], { unique: true })
export class ContractRequest extends BaseEntity {
  /** Año fiscal del registro (Ej: 2026) */
  @Column({ name: 'registration_year', type: 'smallint', unsigned: true })
  registrationYear: number;

  /** Número consecutivo anual en el libro de registro (Columna "No.") */
  @Column({ name: 'consecutive_number', type: 'int', unsigned: true })
  consecutiveNumber: number;

  /** Código interno normalizado ECIE (Ej: "ECIE 2026-20-01", "ECIE 2025-20-75-02") */
  @Index({ unique: true })
  @Column({ name: 'ecie_internal_code', type: 'varchar', length: 50 })
  ecieInternalCode: string;

  /** Número de contrato asignado por la contraparte externa (Ej: "SE-14-011-2026") */
  @Index()
  @Column({
    name: 'counterparty_contract_number',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  counterpartyContractNumber: string | null;

  /** Categoría documental según reglas de la hoja "Leyenda" */
  @Column({
    name: 'instrument_category',
    type: 'enum',
    enum: InstrumentCategory,
    default: InstrumentCategory.MASTER_CONTRACT,
  })
  instrumentCategory: InstrumentCategory;

  /** Número ordinal del suplemento o contrato específico (Ej: 1, 2) */
  @Column({
    name: 'sub_instrument_number',
    type: 'smallint',
    unsigned: true,
    nullable: true,
  })
  subInstrumentNumber: number | null;

  // =========================================================================
  // JERARQUÍA DOCUMENTAL (AUTO-REFERENCIA)
  // =========================================================================

  /** Contrato Principal/Marco del cual se deriva este instrumento (null si es Principal) */
  @ManyToOne(() => ContractRequest, (contract) => contract.derivedInstruments, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_contract_id' })
  parentContract: Relation<ContractRequest> | null;

  @Column({ name: 'parent_contract_id', type: 'uuid', nullable: true })
  parentContractId: string | null;

  /** Contratos específicos y suplementos subordinados a este contrato */
  @OneToMany(() => ContractRequest, (contract) => contract.parentContract)
  derivedInstruments: Relation<ContractRequest>[];

  // =========================================================================
  // RELACIONES CON CATÁLOGOS
  // =========================================================================

  /** Entidad o persona natural con la que se contrata */
  @ManyToOne(() => Counterparty, (counterparty) => counterparty.contractRequests, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'counterparty_id' })
  counterparty: Relation<Counterparty>;

  @Column({ name: 'counterparty_id', type: 'uuid' })
  counterpartyId: string;

  /** Tipología del contrato (Servicios, Obra, Compraventa, etc.) */
  @ManyToOne(() => ContractType, (type) => type.contractRequests, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'contract_type_id' })
  contractType: Relation<ContractType>;

  @Column({ name: 'contract_type_id', type: 'uuid' })
  contractTypeId: string;

  /** Área especializada de la ECIE que administra el contrato */
  @ManyToOne(() => SpecializedArea, (area) => area.contractRequests, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'specialized_area_id' })
  specializedArea: Relation<SpecializedArea>;

  @Column({ name: 'specialized_area_id', type: 'uuid' })
  specializedAreaId: string;

  // =========================================================================
  // DATOS DESCRIPTIVOS Y CRONOLOGÍA
  // =========================================================================

  /** Objeto contractual detallado */
  @Column({ type: 'text' })
  subject: string;

  /** Fecha de entrada oficial del expediente a la UEB */
  @Column({ name: 'ueb_entry_date', type: 'date' })
  uebEntryDate: Date;

  /** Fecha de emisión del dictamen legal (unifica las 3 columnas D/M/A del Excel) */
  @Column({ name: 'legal_opinion_date', type: 'date', nullable: true })
  legalOpinionDate: Date | null;

  /** Fecha efectiva de firma del contrato */
  @Index()
  @Column({ name: 'signature_date', type: 'date', nullable: true })
  signatureDate: Date | null;

  // =========================================================================
  // GESTIÓN ECONÓMICA (PRECISIÓN DECIMAL 18,2)
  // =========================================================================

  /** Modalidad económica del instrumento (Monto fijo, Sumatoria o No refiere valor) */
  @Column({
    name: 'amount_type',
    type: 'enum',
    enum: AmountType,
    default: AmountType.FIXED_AMOUNT,
  })
  amountType: AmountType;

  /** Valor económico del contrato; null cuando amountType es SUMMATION o NO_VALUE_REFERRED */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: new DecimalColumnTransformer(),
  })
  amount: number | null;

  /** Moneda del contrato (por defecto CUP) */
  @Column({ type: 'varchar', length: 3, default: 'CUP' })
  currency: string;

  // =========================================================================
  // GESTIÓN DE VIGENCIA
  // =========================================================================

  /** Tipo de vigencia pactada */
  @Column({
    name: 'validity_type',
    type: 'enum',
    enum: ValidityType,
    default: ValidityType.SPECIFIC_DATE,
  })
  validityType: ValidityType;

  /** Fecha de inicio de vigencia (opcional, por defecto coincide con signatureDate) */
  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom: Date | null;

  /** Fecha exacta de vencimiento (cuando validityType === SPECIFIC_DATE) */
  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate: Date | null;

  /** Descripción textual de vigencia (Ej: "Cumplimiento de las Obligaciones", "3 años") */
  @Column({
    name: 'validity_description',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  validityDescription: string | null;

  // =========================================================================
  // FLUJO DE APROBACIÓN Y ARCHIVO EN ECONOMÍA
  // =========================================================================

  /** Estado actual dentro del flujo del Comité de Contratación */
  @Index()
  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING_UEB_CC,
  })
  approvalStatus: RequestStatus;

  /** Estado del expediente físico en el archivo de Economía */
  @Column({
    name: 'economy_archive_status',
    type: 'enum',
    enum: EconomyArchiveStatus,
    default: EconomyArchiveStatus.PENDING,
  })
  economyArchiveStatus: EconomyArchiveStatus;

  /** Referencia textual original al acta de aprobación UEB (para trazabilidad histórica) */
  @Column({ name: 'ueb_minutes_reference', type: 'varchar', length: 255, nullable: true })
  uebMinutesReference: string | null;

  /** Relación directa con el acta donde se aprobó en UEB */
  @ManyToOne(() => CommitteeMinute, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ueb_minute_id' })
  uebMinute: Relation<CommitteeMinute> | null;

  @Column({ name: 'ueb_minute_id', type: 'uuid', nullable: true })
  uebMinuteId: string | null;

  /** Observaciones de seguimiento (Ej: "Certifico legal sin firma", "Falta certificado legal") */
  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  // =========================================================================
  // RELACIÓN N:M CON ACUERDOS DEL COMITÉ DE CONTRATACIÓN
  // =========================================================================

  /** Acuerdos adoptados en sesiones del Comité vinculados a este expediente */
  @ManyToMany(() => CommitteeResolution, (resolution) => resolution.relatedRequests)
  @JoinTable({
    name: 'contract_request_resolutions',
    joinColumn: { name: 'contract_request_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'resolution_id', referencedColumnName: 'id' },
  })
  resolutions: Relation<CommitteeResolution>[];
}
