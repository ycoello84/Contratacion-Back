import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { Meeting } from '../../meetings/entities/meeting.entity.js';
import { ContractApprovalStatus } from './contract-approval-status.enum.js';
import { ContractType } from './contract-type.enum.js';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_contracts_no_contrato', { unique: true })
  @Column({ name: 'no_contrato', type: 'varchar', length: 60 })
  contractNumber: string;

  @Index('idx_contracts_tipo_relacion')
  @Column({
    name: 'tipo_relacion_contractual',
    type: 'enum',
    enum: ContractType,
    default: ContractType.CONTRATO_PRINCIPAL,
  })
  contractRelationshipType: ContractType;

  @Column({ name: 'contrato_padre_id', type: 'int', nullable: true })
  parentContractId: number | null;

  @ManyToOne(() => Contract, (contract) => contract.childContracts, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'contrato_padre_id' })
  parentContract: Relation<Contract> | null;

  @OneToMany(() => Contract, (contract) => contract.parentContract)
  childContracts: Relation<Contract>[];

  @Column({ type: 'text' })
  object: string;

  @Column({ name: 'empresa_origen_id', type: 'int' })
  originCompanyId: number;

  @ManyToOne(() => Company, (company) => company.contractsAsOrigin, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'empresa_origen_id' })
  originCompany: Relation<Company>;

  @Column({ name: 'empresa_destino_id', type: 'int' })
  destinationCompanyId: number;

  @ManyToOne(() => Company, (company) => company.contractsAsDestination, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'empresa_destino_id' })
  destinationCompany: Relation<Company>;

  @Column({
    name: 'area_especializada',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  specializedArea: string | null;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  value: string | null;

  @Column({ name: 'sin_valor_refiere', type: 'boolean', default: false })
  noValueReference: boolean;

  @Column({ name: 'fecha_entrada_ueb', type: 'date', nullable: true })
  uebEntryDate: string | null;

  @Column({ name: 'fecha_emision_dictamen', type: 'date', nullable: true })
  opinionIssueDate: string | null;

  @Column({ name: 'fecha_inicio', type: 'date' })
  startDate: string;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  expirationDate: string | null;

  @Index('idx_contracts_estado_aprobacion_cc')
  @Column({
    name: 'estado_aprobacion_cc',
    type: 'enum',
    enum: ContractApprovalStatus,
    default: ContractApprovalStatus.PENDIENTE_APROBACION_EMPRESA,
  })
  ccApprovalStatus: ContractApprovalStatus;

  @Column({ name: 'acta_cc_id', type: 'int', nullable: true })
  actCcId: number | null;

  @ManyToOne(() => Meeting, (meeting) => meeting.contracts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'acta_cc_id' })
  actCc: Relation<Meeting> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
