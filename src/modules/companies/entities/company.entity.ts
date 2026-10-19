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
  taxId: string;

  @Index('idx_companies_razon_social')
  @Column({ name: 'razon_social', type: 'varchar', length: 200 })
  businessName: string;

  @Index('idx_companies_siglas')
  @Column({ name: 'siglas', type: 'varchar', length: 64, nullable: true })
  acronym: string | null;

  @Column({ name: 'direccion', type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ name: 'telefono', type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({
    name: 'email_contacto',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  contactEmail: string | null;

  @Index('idx_companies_es_ueb')
  @Column({ name: 'es_ueb', type: 'boolean', default: false })
  isUeb: boolean;

  @Column({ name: 'parent_empresa_id', type: 'int', nullable: true })
  parentCompanyId: number | null;

  @ManyToOne(() => Company, (company) => company.subsidiaries, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_empresa_id' })
  parentCompany: Relation<Company> | null;

  @OneToMany(() => Company, (company) => company.parentCompany)
  subsidiaries: Relation<Company>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Contract, (contract) => contract.originCompany)
  contractsAsOrigin: Relation<Contract>[];

  @OneToMany(() => Contract, (contract) => contract.destinationCompany)
  contractsAsDestination: Relation<Contract>[];
}
