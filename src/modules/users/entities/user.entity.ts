import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.enum.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_users_email', { unique: true })
  @Column({ type: 'varchar', length: 180 })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 120, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Index('idx_users_rol')
  @Column({ type: 'enum', enum: UserRole, default: UserRole.LECTOR })
  rol: UserRole;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
