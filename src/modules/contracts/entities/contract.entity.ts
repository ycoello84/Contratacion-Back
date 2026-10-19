import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
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
  noContrato: string;

  @Index('idx_contracts_tipo_relacion')
  @Column({
    name: 'tipo_relacion_contractual',
    type: 'enum',
    enum: ContractType,
    default: ContractType.CONTRATO_PRINCIPAL,
  })
  tipoRelacionContractual: ContractType;

  @Column({ name: 'contrato_padre_id', type: 'int', nullable: true })
  contratoPadreId: number | null;

  @ManyToOne(() => Contract, (contract) => contract.contratosHijos, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'contrato_padre_id' })
  contratoPadre: Contract | null;

  @OneToMany(() => Contract, (contract) => contract.contratoPadre)
  contratosHijos: Contract[];

  @Column({ type: 'text' })
  objeto: string;

  @Column({ name: 'empresa_origen_id', type: 'int' })
  empresaOrigenId: number;

  @ManyToOne(() => Company, (company) => company.contratosComoOrigen, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'empresa_origen_id' })
  empresaOrigen: Company;

  @Column({ name: 'empresa_destino_id', type: 'int' })
  empresaDestinoId: number;

  @ManyToOne(() => Company, (company) => company.contratosComoDestino, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'empresa_destino_id' })
  empresaDestino: Company;

  @Column({
    name: 'area_especializada',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  areaEspecializada: string | null;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  valor: string | null;

  @Column({ name: 'sin_valor_refiere', type: 'boolean', default: false })
  sinValorRefiere: boolean;

  @Column({ name: 'fecha_entrada_ueb', type: 'date', nullable: true })
  fechaEntradaUeb: string | null;

  @Column({ name: 'fecha_emision_dictamen', type: 'date', nullable: true })
  fechaEmisionDictamen: string | null;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: string;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  fechaVencimiento: string | null;

  @Index('idx_contracts_estado_aprobacion_cc')
  @Column({
    name: 'estado_aprobacion_cc',
    type: 'enum',
    enum: ContractApprovalStatus,
    default: ContractApprovalStatus.PENDIENTE_APROBACION_EMPRESA,
  })
  estadoAprobacionCc: ContractApprovalStatus;

  @Column({ name: 'acta_cc_id', type: 'int', nullable: true })
  actaCcId: number | null;

  @ManyToOne(() => Meeting, (meeting) => meeting.contratos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'acta_cc_id' })
  actaCc: Meeting | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
