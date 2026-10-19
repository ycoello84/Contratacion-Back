import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { Meeting } from '../../meetings/entities/meeting.entity.js';

@Entity('workers')
export class Worker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre_completo', type: 'varchar', length: 160 })
  nombreCompleto: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  cargo: string | null;

  @Index('idx_workers_email')
  @Column({ type: 'varchar', length: 180, nullable: true })
  email: string | null;

  @Column({ name: 'empresa_id', type: 'int', nullable: true })
  empresaId: number | null;

  @Index('idx_workers_es_miembro_cc')
  @Column({ name: 'es_miembro_cc', type: 'boolean', default: false })
  esMiembroCc: boolean;

  @Column({ name: 'cargo_cc', type: 'varchar', length: 100, nullable: true })
  cargoCc: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: Company | null;

  @ManyToMany(() => Meeting, (meeting) => meeting.trabajadores)
  reuniones: Meeting[];
}
