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
  numeroAcuerdo: string;

  @Column({ name: 'acta_cc_id', type: 'int' })
  actaCcId: number;

  @ManyToOne(() => Meeting, (meeting) => meeting.acuerdos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'acta_cc_id' })
  actaCc: Relation<Meeting>;

  @Column({ name: 'contrato_id', type: 'int', nullable: true })
  contratoId: number | null;

  @ManyToOne(() => Contract, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contrato_id' })
  contrato: Relation<Contract> | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  punto: string | null;

  @Column({ type: 'text' })
  detalle: string;

  @Column({ name: 'responsable_id', type: 'int' })
  responsableId: number;

  @ManyToOne(() => Worker, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsable_id' })
  responsable: Relation<Worker>;

  @Column({ name: 'fecha_cumplimiento', type: 'date' })
  fechaCumplimiento: string;

  @Index('idx_agreements_estado_cumplimiento')
  @Column({
    name: 'estado_cumplimiento',
    type: 'enum',
    enum: AgreementStatus,
    default: AgreementStatus.PENDIENTE,
  })
  estadoCumplimiento: AgreementStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
