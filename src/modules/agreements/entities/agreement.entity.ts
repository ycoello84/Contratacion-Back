import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from '../../contracts/entities/contract.entity.js';
import { Meeting } from '../../meetings/entities/meeting.entity.js';
import { Worker } from '../../workers/entities/worker.entity.js';
import { AgreementStatus } from './agreement-status.enum.js';

@Entity('agreements')
export class Agreement {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_agreements_numero_acuerdo', { unique: true })
  @Column({ name: 'numero_acuerdo', type: 'varchar', length: 60 })
  agreementNumber: string;

  @Column({ name: 'acta_cc_id', type: 'int' })
  actCcId: number;

  @ManyToOne(() => Meeting, (meeting) => meeting.agreements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'acta_cc_id' })
  actCc: Relation<Meeting>;

  @Column({ name: 'contrato_id', type: 'int', nullable: true })
  contractId: number | null;

  @ManyToOne(() => Contract, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contrato_id' })
  contract: Relation<Contract> | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  point: string | null;

  @Column({ type: 'text' })
  detail: string;

  @Column({ name: 'responsable_id', type: 'int' })
  responsibleId: number;

  @ManyToOne(() => Worker, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsable_id' })
  responsible: Relation<Worker>;

  @Column({ name: 'fecha_cumplimiento', type: 'date' })
  complianceDate: string;

  @Index('idx_agreements_estado_cumplimiento')
  @Column({
    name: 'estado_cumplimiento',
    type: 'enum',
    enum: AgreementStatus,
    default: AgreementStatus.PENDIENTE,
  })
  complianceStatus: AgreementStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
