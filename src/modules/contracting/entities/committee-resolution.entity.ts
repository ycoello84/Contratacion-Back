import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { type Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { ResolutionStatus } from '../enums/contracting.enums.js';
import { CommitteeMinute } from './committee-minute.entity.js';
import { ContractRequest } from './contract-request.entity.js';

/**
 * Modela cada acuerdo individual adoptado dentro de un Acta del Comité de Contratación.
 * Permite controlar responsables, fechas límite, cumplimiento efectivo y vinculación
 * con una o varias solicitudes de contrato.
 */
@Entity('committee_resolutions')
@Index(['minuteId', 'resolutionNumber'], { unique: true })
export class CommitteeResolution extends BaseEntity {
  /** Acta a la que pertenece el acuerdo */
  @ManyToOne(() => CommitteeMinute, (minute) => minute.resolutions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'minute_id' })
  minute: Relation<CommitteeMinute>;

  @Column({ name: 'minute_id', type: 'uuid' })
  minuteId: string;

  /** Punto del orden del día bajo el cual se discutió (Columna "Punto") */
  @Column({ name: 'agenda_item', type: 'varchar', length: 30, nullable: true })
  agendaItem: string | null;

  /** Número consecutivo del acuerdo (Columna "Acuerdo No.") */
  @Column({ name: 'resolution_number', type: 'int', unsigned: true })
  resolutionNumber: number;

  /** Redacción íntegra del acuerdo aprobado */
  @Column({ type: 'text' })
  description: string;

  /** Responsable designado para ejecutar el acuerdo (Por defecto: "Miembros del CC") */
  @Column({ type: 'varchar', length: 150, default: 'Miembros del CC' })
  responsible: string;

  /** Fecha compromiso pactada para su cumplimiento (Columna "Fecha Cmpto") */
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  /** Fecha real en que se verificó el cumplimiento */
  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: Date | null;

  /** Estado actual de cumplimiento del acuerdo */
  @Index()
  @Column({
    type: 'enum',
    enum: ResolutionStatus,
    default: ResolutionStatus.PENDING,
  })
  status: ResolutionStatus;

  /** Observaciones de seguimiento (Ej: "Falta certificado firmado OFC", "Convenio EISA") */
  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  /** Expedientes contractuales asociados a este acuerdo */
  @ManyToMany(() => ContractRequest, (request) => request.resolutions)
  relatedRequests: Relation<ContractRequest>[];
}
