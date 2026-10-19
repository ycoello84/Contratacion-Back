import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { Meeting } from '../../meetings/entities/meeting.entity.js';

@Entity('workers')
export class Worker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre_completo', type: 'varchar', length: 160 })
  fullName: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  position: string | null;

  @Index('idx_workers_email')
  @Column({ type: 'varchar', length: 180, nullable: true })
  email: string | null;

  @Column({ name: 'empresa_id', type: 'int', nullable: true })
  companyId: number | null;

  @Index('idx_workers_es_miembro_cc')
  @Column({ name: 'es_miembro_cc', type: 'boolean', default: false })
  isCcMember: boolean;

  @Column({ name: 'cargo_cc', type: 'varchar', length: 100, nullable: true })
  ccPosition: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'empresa_id' })
  company: Relation<Company> | null;

  @ManyToMany(() => Meeting, (meeting) => meeting.workers)
  meetings: Relation<Meeting>[];
}
