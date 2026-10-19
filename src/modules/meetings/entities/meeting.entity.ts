import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Agreement } from '../../agreements/entities/agreement.entity.js';
import { Contract } from '../../contracts/entities/contract.entity.js';
import { Worker } from '../../workers/entities/worker.entity.js';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_meetings_numero_acta', { unique: true })
  @Column({ name: 'numero_acta', type: 'varchar', length: 80 })
  numeroActa: string;

  @Index('idx_meetings_fecha_reunion')
  @Column({ name: 'fecha_reunion', type: 'datetime' })
  fechaReunion: Date;

  @Column({ name: 'orden_del_dia', type: 'text' })
  ordenDelDia: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Worker, (worker) => worker.reuniones, {
    onDelete: 'CASCADE',
  })
  @JoinTable({
    name: 'meeting_workers',
    joinColumn: {
      name: 'meeting_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'worker_id',
      referencedColumnName: 'id',
    },
  })
  trabajadores: Relation<Worker>[];

  @OneToMany(() => Contract, (contract) => contract.actaCc)
  contratos: Relation<Contract>[];

  @OneToMany(() => Agreement, (agreement) => agreement.actaCc)
  acuerdos: Relation<Agreement>[];
}
