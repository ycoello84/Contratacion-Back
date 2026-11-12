import { Column, Entity, Index, OneToMany } from 'typeorm';
import { type Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { CommitteeResolution } from './committee-resolution.entity.js';

/**
 * Representa cada sesión ordinaria o extraordinaria del Comité de Contratación (Acta).
 * Agrupa los acuerdos tomados en una misma fecha (Hoja "Acuerdos").
 */
@Entity('committee_minutes')
@Index(['year', 'minuteNumber'], { unique: true })
export class CommitteeMinute extends BaseEntity {
  /** Año de celebración del acta */
  @Column({ type: 'smallint', unsigned: true })
  year: number;

  /** Número consecutivo anual del acta (Ej: 1, 2, 3...) */
  @Column({ name: 'minute_number', type: 'int', unsigned: true })
  minuteNumber: number;

  /** Fecha oficial de la sesión del Comité */
  @Index()
  @Column({ name: 'session_date', type: 'date' })
  sessionDate: Date;

  /** Notas generales o resumen del orden del día */
  @Column({ name: 'agenda_summary', type: 'text', nullable: true })
  agendaSummary: string | null;

  /** Acuerdos aprobados en esta sesión */
  @OneToMany(() => CommitteeResolution, (resolution) => resolution.minute, {
    cascade: true,
  })
  resolutions: Relation<CommitteeResolution>[];
}
