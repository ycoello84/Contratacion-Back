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
import { Contract } from '../../contracts/entities/contract.entity.js';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_companies_identificacion_fiscal', { unique: true })
  @Column({
    name: 'identificacion_fiscal',
    type: 'varchar',
    length: 64,
  })
  identificacionFiscal: string;

  @Index('idx_companies_razon_social')
  @Column({ name: 'razon_social', type: 'varchar', length: 200 })
  razonSocial: string;

  @Index('idx_companies_siglas')
  @Column({ name: 'siglas', type: 'varchar', length: 64, nullable: true })
  siglas: string | null;

  @Column({ name: 'direccion', type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @Column({ name: 'telefono', type: 'varchar', length: 32, nullable: true })
  telefono: string | null;

  @Column({
    name: 'email_contacto',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  emailContacto: string | null;

  @Index('idx_companies_es_ueb')
  @Column({ name: 'es_ueb', type: 'boolean', default: false })
  esUeb: boolean;

  @Column({ name: 'parent_empresa_id', type: 'int', nullable: true })
  parentEmpresaId: number | null;

  @ManyToOne(() => Company, (company) => company.uebs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_empresa_id' })
  parentEmpresa: Relation<Company> | null;

  @OneToMany(() => Company, (company) => company.parentEmpresa)
  uebs: Relation<Company>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Contract, (contract) => contract.empresaOrigen)
  contratosComoOrigen: Relation<Contract>[];

  @OneToMany(() => Contract, (contract) => contract.empresaDestino)
  contratosComoDestino: Relation<Contract>[];
}
