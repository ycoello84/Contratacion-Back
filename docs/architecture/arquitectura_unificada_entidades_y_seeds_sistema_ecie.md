# Arquitectura de Software, Modelo de Datos y Seeds — Sistema de Contratación ECIE

**Stack Tecnológico:** NestJS (v10+) + TypeORM (v0.3+) + MySQL 8.0+  
**Origen de Datos:** Consolidación de análisis estructural y registros reales de `REGISTRO DE SOLICITUD CONTRATO 2026.xls`  
**Convención de Ingeniería:** Código fuente, entidades, columnas y DTOs en **inglés** (`camelCase` en TS, `snake_case` en MySQL); documentación JSDoc, comentarios funcionales y reglas de negocio en **español**.

---

## 1. Matriz Comparativa de Propuestas y Decisión Arquitectónica

Esta propuesta unifica las fortalezas de las tres iteraciones previas para alcanzar estándares de nivel empresarial (*Enterprise-Grade*):

| Criterio Técnico | Propuesta 1 (Base) | Propuesta 2 (DeepSeek) | Propuesta 3 (Qwen) | **Arquitectura Unificada (Estándar Final)** |
| :--- | :--- | :--- | :--- | :--- |
| **Identificadores Primarios** | `UUID v4` (Seguridad y distribución) | `INT UNSIGNED` autoincremental | `Integer` simple | **`UUID v4`** como PK pública + **`registrationYear` & `consecutiveNumber`** con índice único compuesto para mantener la numeración legal anual. |
| **Precisión Financiera** | `DECIMAL(15,2)` + `ValueTransformer` | `DECIMAL(18,2)` como `string` | `Decimal` genérico | **`DECIMAL(18, 2)` + `DecimalColumnTransformer`** (soporta grandes inversiones en CUP sin errores de punto flotante en JS). |
| **Modelado de Estados** | Enums estrictos (`RequestStatus`, `EconomyArchiveStatus`) | Tabla catálogo `request_statuses` con `color_hex` | Strings planos | **Híbrido Óptimo:** Enums estrictos en código para reglas de negocio/transiciones + metadatos de presentación (colores de la hoja `Leyenda`) para el Frontend. |
| **Jerarquía Contractual** | Auto-referencia (`parentContractId`) + `InstrumentCategory` | Auto-referencia + tabla `document_types` | Campo de texto `contractNumber` | **Auto-referencia (`parentContractId`) + `InstrumentCategory` + `subInstrumentNumber`**, permitiendo calcular ejecuciones acumuladas de Contratos Marco. |
| **Vigencias y Valores Mixtos** | Desacoplado (`AmountType` + `amount`, `ValidityType` + `expirationDate`) | `amount` + `amount_text` / `validity_from` + `validity_to` + `validity_text` | Campos mixtos | **Desacoplamiento estricto + rango completo (`validFrom`, `expirationDate`, `validityDescription`)** para soportar fechas exactas, *"Cumplimiento de las Obligaciones"* e *"Indefinido"*. |
| **Comité de Contratación** | `CommitteeMinute` (1:N) `CommitteeResolution` (N:M) `ContractRequest` | `Minutes` (1:N) `Agreement` (N:M) `Contract` | JSON anidado por acta | **Normalización 3FN (`CommitteeMinute` -> `CommitteeResolution` <-> `ContractRequest`)** con seguimiento de fecha pactada vs. fecha real de cumplimiento. |
| **Capa de Aplicación y Seeds** | Solo entidades | Configuración, DTOs, Servicios con Transacciones, SQL e Importador | 20 registros reales de contratos y actas | **Arquitectura Full-Stack Backend:** Entidades + Config + DTOs + Servicio Transaccional + **Seeds completos (Catálogos + Datos Reales)**. |

---

## 2. Arquitectura Relacional y Estructura de Directorios

```text
[Counterparty] 1 ────< [ContractRequest] >──── N:M ────< [CommitteeResolution] >──── 1 [CommitteeMinute]
                             │   │   │                               │
                 ┌───────────┘   │   └───────────┐            (Responsible & DueDate)
                 ▼               ▼               ▼
         (Auto-referencia) [ContractType] [SpecializedArea]
    Master -> Specific / Addendum
```

### Estructura Modular (DDD-Lite)

```text
src/
├── common/
│   ├── dto/
│   │   └── pagination.dto.ts
│   ├── entities/
│   │   └── base.entity.ts
│   └── transformers/
│       └── decimal.transformer.ts
├── config/
│   └── typeorm.config.ts
└── modules/
    └── contracting/
        ├── dto/
        │   └── create-contract-request.dto.ts
        ├── entities/
        │   ├── committee-minute.entity.ts
        │   ├── committee-resolution.entity.ts
        │   ├── contract-request.entity.ts
        │   ├── contract-type.entity.ts
        │   ├── counterparty.entity.ts
        │   └── specialized-area.entity.ts
        ├── enums/
        │   └── contracting.enums.ts
        ├── seeds/
        │   ├── catalogs.seed.data.ts
        │   ├── contracts-and-minutes.seed.data.ts
        │   └── database-seeder.service.ts
        └── services/
            └── contract-request.service.ts
```

---

## 3. Infraestructura Base (`common/` y `config/`)

### `src/common/entities/base.entity.ts`

```typescript
import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Entidad base abstracta para todo el dominio.
 * Provee clave primaria UUID v4, marcas de tiempo con precisión de microsegundos
 * y soporte nativo para borrado lógico (Soft Delete) exigido en auditorías institucionales.
 */
export abstract class BaseEntity {
  /** Identificador único universal (UUID v4) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Fecha y hora de creación del registro en UTC */
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  /** Fecha y hora de última actualización en UTC */
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;

  /** Fecha de eliminación lógica; si es null, el registro permanece activo */
  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6, nullable: true })
  deletedAt: Date | null;
}
```

### `src/common/transformers/decimal.transformer.ts`

```typescript
import { ValueTransformer } from 'typeorm';

/**
 * Transformador bidireccional entre DECIMAL de MySQL y number de TypeScript.
 * Evita que los montos financieros lleguen como strings al dominio y previene
 * imprecisiones de punto flotante al persistir en base de datos.
 */
export class DecimalColumnTransformer implements ValueTransformer {
  /** Convierte de TypeScript a MySQL */
  to(data?: number | null): number | null {
    return data ?? null;
  }

  /** Convierte de MySQL (string) a TypeScript (number) */
  from(data?: string | null): number | null {
    if (data === null || data === undefined) return null;
    const parsed = parseFloat(data);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
```

### `src/config/typeorm.config.ts`

```typescript
import { DataSourceOptions } from 'typeorm';

/**
 * Configuración centralizada de conexión a MySQL 8+.
 * - charset 'utf8mb4': soporte completo para tildes, eñes y caracteres especiales.
 * - timezone 'Z': estandarización de fechas en UTC.
 * - synchronize: desactivado en producción para exigir migraciones versionadas.
 */
export const getTypeOrmConfig = (): DataSourceOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'ecie_contracting',
  charset: 'utf8mb4',
  timezone: 'Z',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  extra: {
    connectionLimit: 15,
  },
});
```

---

## 4. Enumeraciones de Dominio (`contracting.enums.ts`)

```typescript
/**
 * Jerarquía documental según nomenclatura oficial ECIE (Ej: ECIE YYYY-XX-NNN):
 * - MASTER_CONTRACT:   ECIE 2019-20-135 (Contrato Principal o Marco)
 * - SPECIFIC_CONTRACT: ECIE 2019-20-135-01 (Sufijo de 2 dígitos)
 * - ADDENDUM:          ECIE 2019-20-135-2 (Sufijo de 1 dígito)
 */
export enum InstrumentCategory {
  MASTER_CONTRACT = 'MASTER_CONTRACT',
  SPECIFIC_CONTRACT = 'SPECIFIC_CONTRACT',
  ADDENDUM = 'ADDENDUM',
}

/**
 * Estados del flujo de aprobación en los Comités de Contratación (Hoja "Leyenda").
 */
export enum RequestStatus {
  /** Expediente incompleto en recepción (Rojo en Leyenda) */
  MISSING_DATA = 'MISSING_DATA',
  /** En análisis en el Comité de Contratación de la UEB */
  PENDING_UEB_CC = 'PENDING_UEB_CC',
  /** No aprobado en el CC de la UEB (Salmón en Leyenda) */
  REJECTED_UEB_CC = 'REJECTED_UEB_CC',
  /** Enviado al CC de la Empresa, pendiente de aprobación (Verde oscuro en Leyenda) */
  PENDING_COMPANY = 'PENDING_COMPANY',
  /** No aprobado en el CC de la Empresa (Marrón en Leyenda) */
  REJECTED_COMPANY = 'REJECTED_COMPANY',
  /** Aprobado por la Empresa, pendiente de formalización/firma (Verde brillante en Leyenda) */
  APPROVED_COMPANY = 'APPROVED_COMPANY',
  /** Aprobado, firmado y conforme (Blanco / OK en Leyenda) */
  APPROVED_OK = 'APPROVED_OK',
  /** Cancelado o desestimado (Azul oscuro en Leyenda) */
  CANCELLED = 'CANCELLED',
}

/**
 * Control de archivo físico y legal en el Departamento de Economía.
 */
export enum EconomyArchiveStatus {
  /** Pendiente de entrega o revisión en Economía */
  PENDING = 'PENDING',
  /** Copia archivada en Economía y conforme ("OK" gris en Leyenda) */
  ARCHIVED_OK = 'ARCHIVED_OK',
  /** Archivado con pendientes documentales (Ej: "falta certifico legal", "sin firma") */
  WITH_OBSERVATIONS = 'WITH_OBSERVATIONS',
}

/**
 * Naturaleza del valor económico del contrato.
 */
export enum AmountType {
  /** Cuantía monetaria fija determinada */
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  /** Contrato marco cuya ejecución es la sumatoria de sus contratos específicos */
  SUMMATION = 'SUMMATION',
  /** Suplemento o acuerdo marco que no refiere valor económico directo */
  NO_VALUE_REFERRED = 'NO_VALUE_REFERRED',
}

/**
 * Modalidad de vigencia temporal del instrumento contractual.
 */
export enum ValidityType {
  /** Vigencia hasta una fecha calendario exacta */
  SPECIFIC_DATE = 'SPECIFIC_DATE',
  /** Vigente hasta el cumplimiento total de las obligaciones ("Cmpto de las Oblig") */
  OBLIGATIONS_FULFILLMENT = 'OBLIGATIONS_FULFILLMENT',
  /** Vigencia indeterminada en el tiempo ("Indefinido") */
  INDEFINITE = 'INDEFINITE',
}

/**
 * Estado de ejecución de un acuerdo adoptado por el Comité de Contratación.
 */
export enum ResolutionStatus {
  /** En plazo de ejecución */
  PENDING = 'PENDING',
  /** Ejecutado satisfactoriamente */
  FULFILLED = 'FULFILLED',
  /** Incumplido fuera de fecha */
  UNFULFILLED = 'UNFULFILLED',
}

/**
 * Naturaleza jurídica de la contraparte contractual.
 */
export enum LegalNature {
  STATE_ENTERPRISE = 'STATE_ENTERPRISE', // Empresa Estatal / OSDE (GEYSEL, INEL, ATI, etc.)
  UEB = 'UEB', // Unidad Empresarial de Base
  COOPERATIVE = 'COOPERATIVE', // CPA, CCS, CNA (Ej: CPA Carlos Marx)
  SME_LLC = 'SME_LLC', // MIPYME / SRL / S.A. (Ej: SEPSA, Islazul)
  SELF_EMPLOYED = 'SELF_EMPLOYED', // Trabajador por Cuenta Propia (TCP)
  OTHER = 'OTHER',
}

/**
 * Metadatos visuales asociados a cada estado según la hoja "Leyenda" del Excel.
 * Útil para exponer un endpoint de configuración hacia el Frontend.
 */
export const REQUEST_STATUS_METADATA: Record<
  RequestStatus,
  { label: string; colorHex: string; order: number }
> = {
  [RequestStatus.MISSING_DATA]: {
    label: 'Faltan datos',
    colorHex: '#E91E63',
    order: 1,
  },
  [RequestStatus.PENDING_UEB_CC]: {
    label: 'Pendiente en CC de la UEB',
    colorHex: '#95A5A6',
    order: 2,
  },
  [RequestStatus.REJECTED_UEB_CC]: {
    label: 'No se aprobó en el CC de la UEB',
    colorHex: '#E67E22',
    order: 3,
  },
  [RequestStatus.PENDING_COMPANY]: {
    label: 'Enviado al CC de la Empresa (Pendiente)',
    colorHex: '#1E8449',
    order: 4,
  },
  [RequestStatus.REJECTED_COMPANY]: {
    label: 'No se aprobó en el CC de la Empresa',
    colorHex: '#7E5109',
    order: 5,
  },
  [RequestStatus.APPROVED_COMPANY]: {
    label: 'Aprobado por la Empresa',
    colorHex: '#2ECC71',
    order: 6,
  },
  [RequestStatus.APPROVED_OK]: {
    label: 'Está aprobado y OK',
    colorHex: '#FFFFFF',
    order: 7,
  },
  [RequestStatus.CANCELLED]: {
    label: 'Cancelado',
    colorHex: '#1B4F72',
    order: 8,
  },
};
```

---

## 5. Entidades del Dominio (`entities/`)

### 5.1 `src/modules/contracting/entities/counterparty.entity.ts`

```typescript
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { LegalNature } from '../enums/contracting.enums';
import { ContractRequest } from './contract-request.entity';

/**
 * Representa a las entidades estatales, cooperativas, MIPYMES o TCP con las que
 * contrata la ECIE. Normaliza la columna "Entidad" evitando duplicidades por variantes
 * ortográficas (ej. "Ramón de Antilla" vs "Ramon de Antillas").
 */
@Entity('counterparties')
export class Counterparty extends BaseEntity {
  /** Razón social o nombre completo oficial de la contraparte */
  @Index({ unique: true })
  @Column({ name: 'official_name', type: 'varchar', length: 255 })
  officialName: string;

  /** Siglas o acrónimo institucional (Ej: "GEYSEL", "INEL", "ATI", "ECOT") */
  @Index()
  @Column({ name: 'acronym', type: 'varchar', length: 60, nullable: true })
  acronym: string | null;

  /** Organismo de la Administración Central del Estado u OSDE superior (Ej: "MINEM", "UNE") */
  @Column({ name: 'parent_agency', type: 'varchar', length: 150, nullable: true })
  parentAgency: string | null;

  /** Código REEUP (entidades estatales) o NIT (formas de gestión no estatal) */
  @Index({ unique: true })
  @Column({ name: 'tax_or_reeup_code', type: 'varchar', length: 50, nullable: true })
  taxOrReeupCode: string | null;

  /** Clasificación jurídica de la contraparte */
  @Column({
    name: 'legal_nature',
    type: 'enum',
    enum: LegalNature,
    default: LegalNature.STATE_ENTERPRISE,
  })
  legalNature: LegalNature;

  /** Indica si la contraparte está habilitada para nuevas contrataciones */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Contratos asociados a esta contraparte */
  @OneToMany(() => ContractRequest, (request) => request.counterparty)
  contractRequests: ContractRequest[];
}
```

### 5.2 `src/modules/contracting/entities/specialized-area.entity.ts`

```typescript
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ContractRequest } from './contract-request.entity';

/**
 * Catálogo de áreas internas de la ECIE responsables de promover y administrar
 * los contratos (Ej: Construcción e Inversiones, Equipo y Transporte, CO Transmisión).
 */
@Entity('specialized_areas')
export class SpecializedArea extends BaseEntity {
  /** Código interno corto del área (Ej: "CONST_INV", "EQ_TRANSP") */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  code: string;

  /** Nombre oficial del área especializada */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  /** Indica si el área está vigente en el organigrama */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Solicitudes tramitadas por esta área */
  @OneToMany(() => ContractRequest, (request) => request.specializedArea)
  contractRequests: ContractRequest[];
}
```

### 5.3 `src/modules/contracting/entities/contract-type.entity.ts`

```typescript
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ContractRequest } from './contract-request.entity';

/**
 * Catálogo de tipologías jurídicas de contratación
 * (Prestación de Servicios, Compraventa, Ejecución de Obra, Transportación, etc.).
 */
@Entity('contract_types')
export class ContractType extends BaseEntity {
  /** Código normalizado en mayúsculas (Ej: "PRESTACION_SERVICIOS") */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  /** Nombre descriptivo del tipo de contrato */
  @Column({ type: 'varchar', length: 150 })
  name: string;

  /** Descripción legal opcional */
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  /** Indica si el tipo de contrato está activo */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Solicitudes clasificadas bajo este tipo */
  @OneToMany(() => ContractRequest, (request) => request.contractType)
  contractRequests: ContractRequest[];
}
```

### 5.4 `src/modules/contracting/entities/contract-request.entity.ts`

```typescript
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DecimalColumnTransformer } from '../../../common/transformers/decimal.transformer';
import {
  AmountType,
  EconomyArchiveStatus,
  InstrumentCategory,
  RequestStatus,
  ValidityType,
} from '../enums/contracting.enums';
import { CommitteeMinute } from './committee-minute.entity';
import { CommitteeResolution } from './committee-resolution.entity';
import { ContractType } from './contract-type.entity';
import { Counterparty } from './counterparty.entity';
import { SpecializedArea } from './specialized-area.entity';

/**
 * Entidad nuclear del sistema. Modela cada fila de la hoja "Registro del CC".
 * Soporta jerarquía padre-hijo (Marco -> Específico / Suplemento), valores heterogéneos,
 * vigencias flexibles y trazabilidad completa con actas y acuerdos del Comité.
 */
@Entity('contract_requests')
@Index(['registrationYear', 'consecutiveNumber'], { unique: true })
export class ContractRequest extends BaseEntity {
  /** Año fiscal del registro (Ej: 2026) */
  @Column({ name: 'registration_year', type: 'smallint', unsigned: true })
  registrationYear: number;

  /** Número consecutivo anual en el libro de registro (Columna "No.") */
  @Column({ name: 'consecutive_number', type: 'int', unsigned: true })
  consecutiveNumber: number;

  /** Código interno normalizado ECIE (Ej: "ECIE 2026-20-01", "ECIE 2025-20-75-02") */
  @Index({ unique: true })
  @Column({ name: 'ecie_internal_code', type: 'varchar', length: 50 })
  ecieInternalCode: string;

  /** Número de contrato asignado por la contraparte externa (Ej: "SE-14-011-2026") */
  @Index()
  @Column({
    name: 'counterparty_contract_number',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  counterpartyContractNumber: string | null;

  /** Categoría documental según reglas de la hoja "Leyenda" */
  @Column({
    name: 'instrument_category',
    type: 'enum',
    enum: InstrumentCategory,
    default: InstrumentCategory.MASTER_CONTRACT,
  })
  instrumentCategory: InstrumentCategory;

  /** Número ordinal del suplemento o contrato específico (Ej: 1, 2) */
  @Column({
    name: 'sub_instrument_number',
    type: 'smallint',
    unsigned: true,
    nullable: true,
  })
  subInstrumentNumber: number | null;

  // =========================================================================
  // JERARQUÍA DOCUMENTAL (AUTO-REFERENCIA)
  // =========================================================================

  /** Contrato Principal/Marco del cual se deriva este instrumento (null si es Principal) */
  @ManyToOne(() => ContractRequest, (contract) => contract.derivedInstruments, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_contract_id' })
  parentContract: ContractRequest | null;

  @Column({ name: 'parent_contract_id', type: 'uuid', nullable: true })
  parentContractId: string | null;

  /** Contratos específicos y suplementos subordinados a este contrato */
  @OneToMany(() => ContractRequest, (contract) => contract.parentContract)
  derivedInstruments: ContractRequest[];

  // =========================================================================
  // RELACIONES CON CATÁLOGOS
  // =========================================================================

  /** Entidad o persona natural con la que se contrata */
  @ManyToOne(() => Counterparty, (counterparty) => counterparty.contractRequests, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'counterparty_id' })
  counterparty: Counterparty;

  @Column({ name: 'counterparty_id', type: 'uuid' })
  counterpartyId: string;

  /** Tipología del contrato (Servicios, Obra, Compraventa, etc.) */
  @ManyToOne(() => ContractType, (type) => type.contractRequests, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'contract_type_id' })
  contractType: ContractType;

  @Column({ name: 'contract_type_id', type: 'uuid' })
  contractTypeId: string;

  /** Área especializada de la ECIE que administra el contrato */
  @ManyToOne(() => SpecializedArea, (area) => area.contractRequests, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'specialized_area_id' })
  specializedArea: SpecializedArea;

  @Column({ name: 'specialized_area_id', type: 'uuid' })
  specializedAreaId: string;

  // =========================================================================
  // DATOS DESCRIPTIVOS Y CRONOLOGÍA
  // =========================================================================

  /** Objeto contractual detallado */
  @Column({ type: 'text' })
  subject: string;

  /** Fecha de entrada oficial del expediente a la UEB */
  @Column({ name: 'ueb_entry_date', type: 'date' })
  uebEntryDate: Date;

  /** Fecha de emisión del dictamen legal (unifica las 3 columnas D/M/A del Excel) */
  @Column({ name: 'legal_opinion_date', type: 'date', nullable: true })
  legalOpinionDate: Date | null;

  /** Fecha efectiva de firma del contrato */
  @Index()
  @Column({ name: 'signature_date', type: 'date', nullable: true })
  signatureDate: Date | null;

  // =========================================================================
  // GESTIÓN ECONÓMICA (PRECISIÓN DECIMAL 18,2)
  // =========================================================================

  /** Modalidad económica del instrumento (Monto fijo, Sumatoria o No refiere valor) */
  @Column({
    name: 'amount_type',
    type: 'enum',
    enum: AmountType,
    default: AmountType.FIXED_AMOUNT,
  })
  amountType: AmountType;

  /** Valor económico del contrato; null cuando amountType es SUMMATION o NO_VALUE_REFERRED */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: new DecimalColumnTransformer(),
  })
  amount: number | null;

  /** Moneda del contrato (por defecto CUP) */
  @Column({ type: 'varchar', length: 3, default: 'CUP' })
  currency: string;

  // =========================================================================
  // GESTIÓN DE VIGENCIA
  // =========================================================================

  /** Tipo de vigencia pactada */
  @Column({
    name: 'validity_type',
    type: 'enum',
    enum: ValidityType,
    default: ValidityType.SPECIFIC_DATE,
  })
  validityType: ValidityType;

  /** Fecha de inicio de vigencia (opcional, por defecto coincide con signatureDate) */
  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom: Date | null;

  /** Fecha exacta de vencimiento (cuando validityType === SPECIFIC_DATE) */
  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate: Date | null;

  /** Descripción textual de vigencia (Ej: "Cumplimiento de las Obligaciones", "3 años") */
  @Column({
    name: 'validity_description',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  validityDescription: string | null;

  // =========================================================================
  // FLUJO DE APROBACIÓN Y ARCHIVO EN ECONOMÍA
  // =========================================================================

  /** Estado actual dentro del flujo del Comité de Contratación */
  @Index()
  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING_UEB_CC,
  })
  approvalStatus: RequestStatus;

  /** Estado del expediente físico en el archivo de Economía */
  @Column({
    name: 'economy_archive_status',
    type: 'enum',
    enum: EconomyArchiveStatus,
    default: EconomyArchiveStatus.PENDING,
  })
  economyArchiveStatus: EconomyArchiveStatus;

  /** Referencia textual original al acta de aprobación UEB (para trazabilidad histórica) */
  @Column({ name: 'ueb_minutes_reference', type: 'varchar', length: 255, nullable: true })
  uebMinutesReference: string | null;

  /** Relación directa con el acta donde se aprobó en UEB */
  @ManyToOne(() => CommitteeMinute, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ueb_minute_id' })
  uebMinute: CommitteeMinute | null;

  @Column({ name: 'ueb_minute_id', type: 'uuid', nullable: true })
  uebMinuteId: string | null;

  /** Observaciones de seguimiento (Ej: "Certifico legal sin firma", "Falta certificado legal") */
  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  // =========================================================================
  // RELACIÓN N:M CON ACUERDOS DEL COMITÉ DE CONTRATACIÓN
  // =========================================================================

  /** Acuerdos adoptados en sesiones del Comité vinculados a este expediente */
  @ManyToMany(() => CommitteeResolution, (resolution) => resolution.relatedRequests)
  @JoinTable({
    name: 'contract_request_resolutions',
    joinColumn: { name: 'contract_request_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'resolution_id', referencedColumnName: 'id' },
  })
  resolutions: CommitteeResolution[];
}
```

### 5.5 `src/modules/contracting/entities/committee-minute.entity.ts`

```typescript
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CommitteeResolution } from './committee-resolution.entity';

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
  resolutions: CommitteeResolution[];
}
```

### 5.6 `src/modules/contracting/entities/committee-resolution.entity.ts`

```typescript
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ResolutionStatus } from '../enums/contracting.enums';
import { CommitteeMinute } from './committee-minute.entity';
import { ContractRequest } from './contract-request.entity';

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
  minute: CommitteeMinute;

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
  relatedRequests: ContractRequest[];
}
```

---

## 6. DTOs y Servicio Transaccional (`dto/` y `services/`)

### `src/modules/contracting/dto/create-contract-request.dto.ts`

```typescript
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AmountType,
  EconomyArchiveStatus,
  InstrumentCategory,
  RequestStatus,
  ValidityType,
} from '../enums/contracting.enums';

/**
 * DTO validado para la creación de una solicitud de contrato.
 * Garantiza integridad de tipos antes de alcanzar la capa de persistencia.
 */
export class CreateContractRequestDto {
  @IsInt()
  @Min(2000)
  registrationYear: number;

  @IsInt()
  @Min(1)
  consecutiveNumber: number;

  @IsString()
  @MaxLength(50)
  ecieInternalCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  counterpartyContractNumber?: string;

  @IsEnum(InstrumentCategory)
  instrumentCategory: InstrumentCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  subInstrumentNumber?: number;

  @IsOptional()
  @IsUUID()
  parentContractId?: string;

  @IsUUID()
  counterpartyId: string;

  @IsUUID()
  contractTypeId: string;

  @IsUUID()
  specializedAreaId: string;

  @IsString()
  subject: string;

  @IsDateString()
  uebEntryDate: string;

  @IsOptional()
  @IsDateString()
  legalOpinionDate?: string;

  @IsOptional()
  @IsDateString()
  signatureDate?: string;

  @IsEnum(AmountType)
  amountType: AmountType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'CUP';

  @IsEnum(ValidityType)
  validityType: ValidityType;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  validityDescription?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  approvalStatus?: RequestStatus;

  @IsOptional()
  @IsEnum(EconomyArchiveStatus)
  economyArchiveStatus?: EconomyArchiveStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}
```

### `src/modules/contracting/services/contract-request.service.ts`

```typescript
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateContractRequestDto } from '../dto/create-contract-request.dto';
import { ContractRequest } from '../entities/contract-request.entity';
import { AmountType, InstrumentCategory } from '../enums/contracting.enums';

/**
 * Servicio de dominio para la gestión de solicitudes de contrato.
 * Implementa validaciones de negocio (jerarquía padre-hijo, coherencia de montos)
 * y operaciones atómicas mediante transacciones explícitas.
 */
@Injectable()
export class ContractRequestService {
  constructor(
    @InjectRepository(ContractRequest)
    private readonly requestRepo: Repository<ContractRequest>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Crea una nueva solicitud validando unicidad de código ECIE, reglas de jerarquía
   * documental y coherencia entre modalidad de valor y monto numérico.
   */
  async create(dto: CreateContractRequestDto): Promise<ContractRequest> {
    const existing = await this.requestRepo.findOne({
      where: { ecieInternalCode: dto.ecieInternalCode },
    });
    if (existing) {
      throw new ConflictException(
        `El código interno ${dto.ecieInternalCode} ya se encuentra registrado.`,
      );
    }

    // Regla de negocio: Específicos y Suplementos deben referenciar un Contrato Padre
    if (
      dto.instrumentCategory !== InstrumentCategory.MASTER_CONTRACT &&
      !dto.parentContractId
    ) {
      throw new BadRequestException(
        'Un Contrato Específico o Suplemento debe estar vinculado a un Contrato Principal (parentContractId).',
      );
    }

    // Regla de negocio: Solo FIXED_AMOUNT admite monto numérico positivo
    if (dto.amountType !== AmountType.FIXED_AMOUNT && dto.amount != null) {
      throw new BadRequestException(
        'Los contratos de tipo SUMMATION o NO_VALUE_REFERRED no deben tener un monto fijo asignado.',
      );
    }

    const entity = this.requestRepo.create(dto);
    return this.requestRepo.save(entity);
  }

  /**
   * Calcula la ejecución financiera acumulada de un Contrato Marco sumando
   * todos sus contratos específicos y suplementos aprobados.
   */
  async getMasterContractExecutionSummary(masterContractId: string) {
    const master = await this.requestRepo.findOne({
      where: { id: masterContractId },
      relations: ['derivedInstruments', 'counterparty'],
    });

    if (!master) {
      throw new NotFoundException(`Contrato ${masterContractId} no encontrado.`);
    }

    const executedAmount = master.derivedInstruments.reduce((acc, child) => {
      return acc + (child.amount ?? 0);
    }, 0);

    return {
      masterCode: master.ecieInternalCode,
      counterparty: master.counterparty.officialName,
      amountType: master.amountType,
      derivedCount: master.derivedInstruments.length,
      totalExecutedAmount: Number(executedAmount.toFixed(2)),
      currency: master.currency,
    };
  }

  /**
   * Vincula de forma atómica e idempotente un acuerdo del Comité a una solicitud de contrato.
   */
  async linkResolutionToRequest(requestId: string, resolutionId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(ContractRequest, {
        where: { id: requestId },
        relations: ['resolutions'],
      });
      if (!request) {
        throw new NotFoundException(`Solicitud ${requestId} no encontrada.`);
      }

      const alreadyLinked = request.resolutions.some((r) => r.id === resolutionId);
      if (!alreadyLinked) {
        await manager
          .createQueryBuilder()
          .relation(ContractRequest, 'resolutions')
          .of(requestId)
          .add(resolutionId);
      }
    });
  }
}
```

---

## 7. Datos Maestros y Registros Reales para Seeds (`seeds/`)

Los siguientes archivos contienen los catálogos normalizados y los primeros **20 registros reales** de contratos y actas extraídos del libro Excel 2026, listos para poblar MySQL de manera idempotente y permitir comparativas funcionales inmediatas.

### 7.1 `src/modules/contracting/seeds/catalogs.seed.data.ts`

```typescript
import { LegalNature } from '../enums/contracting.enums';

/** Catálogo inicial de Tipos de Contrato extraídos del Excel ECIE */
export const CONTRACT_TYPES_SEED = [
  { code: 'PRESTACION_SERVICIOS', name: 'Contrato de Prestación de Servicios' },
  { code: 'COMPRAVENTA', name: 'Contrato de Compraventa' },
  { code: 'TRANSPORTACION', name: 'Contrato de Transportación' },
  { code: 'EJECUCION_OBRA', name: 'Contrato de Ejecución de Obras' },
  { code: 'SUMINISTRO', name: 'Contrato Marco de Suministro' },
  { code: 'INVESTIGACION', name: 'Contrato General de Investigaciones Aplicadas' },
  { code: 'CAPACITACION', name: 'Contrato de Prestación de Servicios de Capacitación' },
  { code: 'ALQUILER_EQUIPOS', name: 'Contrato de Alquiler de Equipos' },
  { code: 'SEGURIDAD_PROTECCION', name: 'Contrato de Servicios de Seguridad y Protección' },
];

/** Catálogo inicial de Áreas Especializadas de la ECIE */
export const SPECIALIZED_AREAS_SEED = [
  { code: 'CONST_INV', name: 'Construcción e Inversiones' },
  { code: 'EQ_TRANSP', name: 'Equipo y Transporte' },
  { code: 'CO_TRANSMISION', name: 'CO Transmisión' },
  { code: 'CO_COMPRAS_SERV', name: 'CO Compras y Servicios' },
  { code: 'RRHH', name: 'Recursos Humanos' },
  { code: 'SEG_PROT', name: 'Seguridad y Protección' },
  { code: 'ORG_SISTEMA', name: 'Organización y Sistema' },
  { code: 'COMUNICACIONES', name: 'Comunicaciones' },
  { code: 'ENERGETICA', name: 'Energética' },
  { code: 'CLIENTE_1', name: 'Cliente No.1' },
  { code: 'CLIENTE_2', name: 'Cliente No.2' },
];

/** Catálogo inicial de Contrapartes normalizadas (evitando duplicidades ortográficas) */
export const COUNTERPARTIES_SEED = [
  {
    officialName: 'Empresa de Grupos Electrógenos y Servicios Eléctricos',
    acronym: 'GEYSEL',
    parentAgency: 'UNE / MINEM',
    legalNature: LegalNature.STATE_ENTERPRISE,
  },
  {
    officialName: 'Empresa Constructora de Obras para el Turismo Ramón de Antilla',
    acronym: 'ECOT Ramón de Antilla',
    parentAgency: 'MINTUR',
    legalNature: LegalNature.STATE_ENTERPRISE,
  },
  {
    officialName: 'Servicios Especializados de Protección S.A., UEB SEPSA Holguín',
    acronym: 'SEPSA Holguín',
    parentAgency: 'MININT',
    legalNature: LegalNature.SME_LLC,
  },
  {
    officialName: 'Empresa Agencia de Protección Contra Incendios APCI Moa',
    acronym: 'APCI Moa',
    parentAgency: 'MININT',
    legalNature: LegalNature.STATE_ENTERPRISE,
  },
  {
    officialName: 'Empresa de Tecnología de la Información y Automática, UEB ATI Santiago',
    acronym: 'ATI Santiago',
    parentAgency: 'UNE / MINEM',
    legalNature: LegalNature.STATE_ENTERPRISE,
  },
  {
    officialName: 'Cooperativa de Producción Agropecuaria Carlos Marx',
    acronym: 'CPA Carlos Marx',
    parentAgency: 'ANAP',
    legalNature: LegalNature.COOPERATIVE,
  },
  {
    officialName: 'Grupo Empresarial Hotelero Islazul S.A.',
    acronym: 'Islazul S.A.',
    parentAgency: 'MINTUR',
    legalNature: LegalNature.SME_LLC,
  },
  {
    officialName: 'Empresa Productora y Comercializadora de Semillas, UEB Semillas Holguín',
    acronym: 'UEB Semillas Holguín',
    parentAgency: 'MINAG',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Unidad Empresarial de Base de Recuperación y Ventas Holguín',
    acronym: 'UEB Recuperación Holguín',
    parentAgency: 'MINDUS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Rubisel Almarales Hernández',
    acronym: 'TCP Rubisel Almarales',
    parentAgency: null,
    legalNature: LegalNature.SELF_EMPLOYED,
  },
  {
    officialName: 'Joel Ignacio Garcés Prieto',
    acronym: 'TCP Joel Ignacio Garcés',
    parentAgency: null,
    legalNature: LegalNature.SELF_EMPLOYED,
  },
  {
    officialName: 'Empresa de Revisión Técnica Automotor, UEB ERTA Oriente',
    acronym: 'UEB ERTA Oriente',
    parentAgency: 'MITRANS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Empresa Nacional de Gases Industriales, UEB Gases Holguín',
    acronym: 'UEB Gases Holguín',
    parentAgency: 'MINDUS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Empresa Comercial del Cemento, UEB Holguín',
    acronym: 'UEB Cemento Holguín',
    parentAgency: 'MICONS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Empresa de Calzado COMBELL, UEB Calzado Jesús Argüelles Hidalgo',
    acronym: 'UEB Calzado COMBELL',
    parentAgency: 'MINDUS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Empresa Taxi-Cuba, UEB Taxi Holguín',
    acronym: 'UEB Taxi Holguín',
    parentAgency: 'MITRANS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Empresa de Ingeniería y Proyectos de la Electricidad',
    acronym: 'INEL',
    parentAgency: 'UNE / MINEM',
    legalNature: LegalNature.STATE_ENTERPRISE,
  },
];
```

### 7.2 `src/modules/contracting/seeds/contracts-and-minutes.seed.data.ts`

```typescript
import {
  AmountType,
  EconomyArchiveStatus,
  InstrumentCategory,
  RequestStatus,
  ResolutionStatus,
  ValidityType,
} from '../enums/contracting.enums';

/** Actas y acuerdos reales de inicio de año 2026 (Hoja "Acuerdos") */
export const MINUTES_SEED = [
  {
    year: 2026,
    minuteNumber: 1,
    sessionDate: '2026-01-05',
    resolutions: [
      {
        agendaItem: '-',
        resolutionNumber: 1,
        description: 'Aprobar el Orden del Día para la reunión del Comité de Contratación.',
        responsible: 'Miembros del CC',
        dueDate: '2026-01-05',
        completedDate: '2026-01-05',
        status: ResolutionStatus.FULFILLED,
        remarks: null,
        relatedContractCodes: [],
      },
      {
        agendaItem: '-',
        resolutionNumber: 2,
        description:
          'Elevar a la empresa el contrato ECIE 2026-20-01 de prestación de servicio con la Empresa de Grupos Electrógenos y Servicios Eléctricos (GEYSEL).',
        responsible: 'Miembros del CC',
        dueDate: '2026-01-08',
        completedDate: '2026-01-08',
        status: ResolutionStatus.FULFILLED,
        remarks: null,
        relatedContractCodes: ['ECIE 2026-20-01'],
      },
      {
        agendaItem: '-',
        resolutionNumber: 3,
        description:
          'Elevar a la empresa el contrato ECIE 2026-20-02 de Transportación con la Empresa Constructora de Obras para el Turismo "Ramón de Antilla".',
        responsible: 'Miembros del CC',
        dueDate: '2026-01-08',
        completedDate: '2026-01-08',
        status: ResolutionStatus.FULFILLED,
        remarks: null,
        relatedContractCodes: ['ECIE 2026-20-02'],
      },
    ],
  },
  {
    year: 2026,
    minuteNumber: 2,
    sessionDate: '2026-01-12',
    resolutions: [
      {
        agendaItem: '-',
        resolutionNumber: 4,
        description: 'Aprobar el Orden del Día para la reunión del Comité de Contratación.',
        responsible: 'Miembros del CC',
        dueDate: '2026-01-12',
        completedDate: '2026-01-12',
        status: ResolutionStatus.FULFILLED,
        remarks: null,
        relatedContractCodes: [],
      },
      {
        agendaItem: '-',
        resolutionNumber: 5,
        description:
          'Aprobar el suplemento al contrato ECIE 2024-20-01-2 de prestación de servicios de detectives ocasionales No.15/24/00089 con SEPSA Holguín.',
        responsible: 'Miembros del CC',
        dueDate: '2026-01-12',
        completedDate: '2026-01-12',
        status: ResolutionStatus.FULFILLED,
        remarks: null,
        relatedContractCodes: ['ECIE 2024-20-01-2'],
      },
      {
        agendaItem: '-',
        resolutionNumber: 6,
        description:
          'Aprobar el suplemento al contrato ECIE 2024-20-31-1 de prestación de servicios EX 000004/24 con APCI Moa.',
        responsible: 'Miembros del CC',
        dueDate: '2026-01-12',
        completedDate: '2026-01-12',
        status: ResolutionStatus.FULFILLED,
        remarks: null,
        relatedContractCodes: ['ECIE 2024-20-31-1'],
      },
    ],
  },
  {
    year: 2026,
    minuteNumber: 3,
    sessionDate: '2026-01-19',
    resolutions: [
      {
        agendaItem: '-',
        resolutionNumber: 7,
        description: 'Aprobar el Orden del Día para la reunión del Comité de Contratación.',
        responsible: 'Miembros del CC',
        dueDate: '2026-01-19',
        completedDate: '2026-01-19',
        status: ResolutionStatus.FULFILLED,
        remarks: null,
        relatedContractCodes: [],
      },
      {
        agendaItem: '-',
        resolutionNumber: 8,
        description:
          'Elevar a la empresa el contrato ECIE 2026-20-03 de prestación de servicio con ATI, UEB ATI Santiago.',
        responsible: 'Miembros del CC',
        dueDate: '2026-01-21',
        completedDate: null,
        status: ResolutionStatus.PENDING,
        remarks: 'Falta certificado firmado OFC',
        relatedContractCodes: ['ECIE 2026-20-03'],
      },
    ],
  },
];

/** Primeros 20 registros reales de la hoja "Registro del CC" (2026) */
export const CONTRACT_REQUESTS_SEED = [
  {
    registrationYear: 2026,
    consecutiveNumber: 1,
    ecieInternalCode: 'ECIE 2026-20-01',
    counterpartyContractNumber: 'SE-14-011-2026',
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'GEYSEL',
    contractTypeCode: 'PRESTACION_SERVICIOS',
    areaCode: 'CONST_INV',
    subject:
      'Ejecución de Servicios Eléctricos (tiros de cables, terminaciones y alambraje, ~16 Km en cables de control, red, fuerza y Fibra Óptica) para el emplazamiento BESS de 50 MW/H de Cueto y nuevo campo de 110 kV.',
    uebEntryDate: '2026-01-30',
    legalOpinionDate: '2025-12-30',
    signatureDate: '2026-02-13',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 15000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2027-02-13',
    validityDescription: null,
    approvalStatus: RequestStatus.PENDING_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.PENDING,
    uebMinutesReference: 'Acta No. 01 - 5/01/2026 - Acuerdo 02',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 2,
    ecieInternalCode: 'ECIE 2026-20-02',
    counterpartyContractNumber: 'No. 02/2026',
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'ECOT Ramón de Antilla',
    contractTypeCode: 'TRANSPORTACION',
    areaCode: 'EQ_TRANSP',
    subject:
      'Establecer las condiciones para la transportación de trabajadores de forma eventual según disponibilidad de ómnibus desde origen a destino reflejado en Anexo No. 1.',
    uebEntryDate: '2026-01-30',
    legalOpinionDate: '2025-12-30',
    signatureDate: '2026-01-09',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 10000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2027-01-09',
    validityDescription: null,
    approvalStatus: RequestStatus.PENDING_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.PENDING,
    uebMinutesReference: 'Acta No. 01 - 5/01/2026 - Acuerdo 03',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 3,
    ecieInternalCode: 'ECIE 2024-20-01-2',
    counterpartyContractNumber: 'Suplemento No. 2 al Contrato 15/24/00089',
    instrumentCategory: InstrumentCategory.ADDENDUM,
    subInstrumentNumber: 2,
    parentCode: null,
    counterpartyAcronym: 'SEPSA Holguín',
    contractTypeCode: 'SEGURIDAD_PROTECCION',
    areaCode: 'SEG_PROT',
    subject: 'Modificar las tarifas de los servicios de detectives y servicios técnicos para el año 2026.',
    uebEntryDate: '2026-01-08',
    legalOpinionDate: '2026-01-07',
    signatureDate: '2026-01-22',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 140000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2027-02-07',
    validityDescription: null,
    approvalStatus: RequestStatus.APPROVED_OK,
    economyArchiveStatus: EconomyArchiveStatus.ARCHIVED_OK,
    uebMinutesReference: 'Acta No. 02 - 12/01/2026 - Acuerdo 05',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 4,
    ecieInternalCode: 'ECIE 2024-20-31-1',
    counterpartyContractNumber: 'Suplemento No. 1 al Contrato EX 000004/24',
    instrumentCategory: InstrumentCategory.ADDENDUM,
    subInstrumentNumber: 1,
    parentCode: null,
    counterpartyAcronym: 'APCI Moa',
    contractTypeCode: 'PRESTACION_SERVICIOS',
    areaCode: 'RRHH',
    subject:
      'Actualizar generales de las partes, prestar servicios de certificación en S/E Moa y Grupo Electrógeno S/E Moa, y modificar Cláusula 5.1 de Pagos.',
    uebEntryDate: '2026-01-08',
    legalOpinionDate: '2026-01-08',
    signatureDate: '2026-01-12',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 91240.8,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2029-05-06',
    validityDescription: null,
    approvalStatus: RequestStatus.APPROVED_OK,
    economyArchiveStatus: EconomyArchiveStatus.ARCHIVED_OK,
    uebMinutesReference: 'Acta No. 02 - 12/01/2026 - Acuerdo 06',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 5,
    ecieInternalCode: 'ECIE 2026-20-03',
    counterpartyContractNumber: '104.206.1.26',
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'ATI Santiago',
    contractTypeCode: 'PRESTACION_SERVICIOS',
    areaCode: 'ORG_SISTEMA',
    subject:
      'Reparación y mantenimiento al equipamiento informático, ingeniería y soporte técnico a la automática industrial, redes, subestaciones y despachos de carga.',
    uebEntryDate: '2026-01-14',
    legalOpinionDate: '2026-01-13',
    signatureDate: '2026-02-13',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 30000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2028-02-13',
    validityDescription: null,
    approvalStatus: RequestStatus.PENDING_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.PENDING,
    uebMinutesReference: 'Acta No. 03 - 19/01/2026 - Acuerdo 08',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 6,
    ecieInternalCode: 'ECIE 2025-20-75-02',
    counterpartyContractNumber: 'Específico No. 02 al Contrato Marco 20/2025',
    instrumentCategory: InstrumentCategory.SPECIFIC_CONTRACT,
    subInstrumentNumber: 2,
    parentCode: null,
    counterpartyAcronym: 'ECOT Ramón de Antilla',
    contractTypeCode: 'EJECUCION_OBRA',
    areaCode: 'CONST_INV',
    subject:
      'Ejecución y entrega de objetos de obra correspondientes al BESS Cueto: construcción de plataforma estructural elevada a +1.30 sobre nivel del terreno.',
    uebEntryDate: '2026-01-22',
    legalOpinionDate: '2026-01-20',
    signatureDate: '2026-01-30',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 33493102.45,
    validityType: ValidityType.OBLIGATIONS_FULFILLMENT,
    expirationDate: null,
    validityDescription: 'Cumplimiento de las Obligaciones',
    approvalStatus: RequestStatus.PENDING_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.PENDING,
    uebMinutesReference: 'Acta No. 04 - 26/01/2026 - Acuerdo 10',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 7,
    ecieInternalCode: 'ECIE 2026-20-04',
    counterpartyContractNumber: null,
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'CPA Carlos Marx',
    contractTypeCode: 'PRESTACION_SERVICIOS',
    areaCode: 'CO_TRANSMISION',
    subject:
      'Mantenimiento a la trocha, chapea manual y poda en la Línea de Alto Voltaje 220 kV Cueto-Moa circuitos 1 y 2 (1.44 km).',
    uebEntryDate: '2026-01-23',
    legalOpinionDate: '2026-01-23',
    signatureDate: null,
    amountType: AmountType.FIXED_AMOUNT,
    amount: 7080937.2,
    validityType: ValidityType.OBLIGATIONS_FULFILLMENT,
    expirationDate: null,
    validityDescription: 'Cumplimiento de las Obligaciones',
    approvalStatus: RequestStatus.PENDING_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.PENDING,
    uebMinutesReference: 'Acta No. 04 - 26/01/2026 - Acuerdo 11',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 8,
    ecieInternalCode: 'ECIE 2025-20-43-1',
    counterpartyContractNumber: 'Suplemento No. 1 al Contrato 248/2025',
    instrumentCategory: InstrumentCategory.ADDENDUM,
    subInstrumentNumber: 1,
    parentCode: null,
    counterpartyAcronym: 'Islazul S.A.',
    contractTypeCode: 'PRESTACION_SERVICIOS',
    areaCode: 'CO_COMPRAS_SERV',
    subject:
      'Modificación de la cláusula 2.7 del Contrato de Venta de Capacidades Hoteleras y Servicios Turísticos respecto a tarifas y precios.',
    uebEntryDate: '2026-01-23',
    legalOpinionDate: null,
    signatureDate: null,
    amountType: AmountType.NO_VALUE_REFERRED,
    amount: null,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2026-05-05',
    validityDescription: null,
    approvalStatus: RequestStatus.PENDING_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.PENDING,
    uebMinutesReference: 'Acta No. 04 - 26/01/2026 - Acuerdo 12',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 9,
    ecieInternalCode: 'ECIE 2026-20-05',
    counterpartyContractNumber: 'No. 03-2026',
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'UEB Semillas Holguín',
    contractTypeCode: 'COMPRAVENTA',
    areaCode: 'CO_COMPRAS_SERV',
    subject: 'Compraventa de productos agropecuarios en moneda nacional demandados por el comprador.',
    uebEntryDate: '2026-01-23',
    legalOpinionDate: '2026-01-22',
    signatureDate: '2026-03-04',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 1000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2031-03-04',
    validityDescription: null,
    approvalStatus: RequestStatus.APPROVED_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.WITH_OBSERVATIONS,
    uebMinutesReference: 'Acta No. 04 - 26/01/2026 - Acuerdo 13',
    remarks: 'Certifico legal sin firma',
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 10,
    ecieInternalCode: 'ECIE 2026-20-06',
    counterpartyContractNumber: '13/2026',
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'UEB Recuperación Holguín',
    contractTypeCode: 'COMPRAVENTA',
    areaCode: 'CLIENTE_1',
    subject:
      'Entrega y cobro de desechos reciclables provenientes del proceso productivo y de servicios en el marco de la estrategia de economía circular.',
    uebEntryDate: '2026-01-30',
    legalOpinionDate: null,
    signatureDate: '2026-02-16',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 1000000.0,
    validityType: ValidityType.INDEFINITE,
    expirationDate: null,
    validityDescription: 'Indefinido',
    approvalStatus: RequestStatus.APPROVED_OK,
    economyArchiveStatus: EconomyArchiveStatus.ARCHIVED_OK,
    uebMinutesReference: 'Acta No. 05 - 02/02/2026 - Acuerdo 15',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 11,
    ecieInternalCode: 'ECIE 2026-20-07',
    counterpartyContractNumber: 'No. 6/2026',
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'TCP Rubisel Almarales',
    contractTypeCode: 'PRESTACION_SERVICIOS',
    areaCode: 'EQ_TRANSP',
    subject:
      'Servicios de mantenimiento y reparación integral de medios de transporte (ajuste y rectificación de sistemas y mecanismos de vehículos).',
    uebEntryDate: '2026-01-30',
    legalOpinionDate: '2026-01-29',
    signatureDate: '2026-03-20',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 50000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2029-03-20',
    validityDescription: null,
    approvalStatus: RequestStatus.PENDING_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.PENDING,
    uebMinutesReference: 'Acta No. 05 - 02/02/2026 - Acuerdo 16',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 12,
    ecieInternalCode: 'ECIE 2026-20-08',
    counterpartyContractNumber: null,
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'TCP Joel Ignacio Garcés',
    contractTypeCode: 'TRANSPORTACION',
    areaCode: 'EQ_TRANSP',
    subject: 'Prestación de servicios de transportación previa solicitud del cliente.',
    uebEntryDate: '2026-01-30',
    legalOpinionDate: '2026-01-29',
    signatureDate: '2026-02-27',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 2000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2027-02-27',
    validityDescription: null,
    approvalStatus: RequestStatus.PENDING_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.PENDING,
    uebMinutesReference: 'Acta No. 05 - 02/02/2026 - Acuerdo 18',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 13,
    ecieInternalCode: 'ECIE 2026-20-09',
    counterpartyContractNumber: 'No. 322026',
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'UEB ERTA Oriente',
    contractTypeCode: 'PRESTACION_SERVICIOS',
    areaCode: 'EQ_TRANSP',
    subject:
      'Servicios de revisión técnica automotor, diagnóstico técnico, defectación de piezas y cambio de documentación vehicular.',
    uebEntryDate: '2026-02-05',
    legalOpinionDate: '2026-02-04',
    signatureDate: '2026-02-09',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 1000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2031-02-09',
    validityDescription: null,
    approvalStatus: RequestStatus.APPROVED_OK,
    economyArchiveStatus: EconomyArchiveStatus.ARCHIVED_OK,
    uebMinutesReference: 'Acta No. 06 - 09/02/2026 - Acuerdo 21',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 14,
    ecieInternalCode: 'ECIE 2026-20-10',
    counterpartyContractNumber: null,
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'UEB Gases Holguín',
    contractTypeCode: 'SUMINISTRO',
    areaCode: 'EQ_TRANSP',
    subject:
      'Suministro de gases industriales, inspección técnica total, mantenimiento y arrendamiento de cilindros para gases a presión.',
    uebEntryDate: '2026-02-06',
    legalOpinionDate: '2026-02-05',
    signatureDate: '2026-02-10',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 1000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2031-02-10',
    validityDescription: null,
    approvalStatus: RequestStatus.APPROVED_OK,
    economyArchiveStatus: EconomyArchiveStatus.ARCHIVED_OK,
    uebMinutesReference: 'Acta No. 06 - 09/02/2026 - Acuerdo 22',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 15,
    ecieInternalCode: 'ECIE 2026-20-11',
    counterpartyContractNumber: null,
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'UEB Cemento Holguín',
    contractTypeCode: 'SUMINISTRO',
    areaCode: 'CO_COMPRAS_SERV',
    subject: 'Contrato Marco de Suministro de cemento.',
    uebEntryDate: '2026-02-12',
    legalOpinionDate: '2026-02-11',
    signatureDate: '2026-02-16',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 1000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2031-02-16',
    validityDescription: null,
    approvalStatus: RequestStatus.APPROVED_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.WITH_OBSERVATIONS,
    uebMinutesReference: 'Acta No. 07 - 16/02/2026 - Acuerdo 24',
    remarks: 'Falta certificado legal',
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 16,
    ecieInternalCode: 'ECIE 2026-20-12',
    counterpartyContractNumber: 'No. 8/2026',
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'ECOT Ramón de Antilla',
    contractTypeCode: 'PRESTACION_SERVICIOS',
    areaCode: 'CONST_INV',
    subject: 'Servicio de abastecimiento de combustible y lubricantes según solicitudes y facturas.',
    uebEntryDate: '2026-02-23',
    legalOpinionDate: '2026-02-23',
    signatureDate: '2026-02-23',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 1000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2031-02-23',
    validityDescription: null,
    approvalStatus: RequestStatus.APPROVED_OK,
    economyArchiveStatus: EconomyArchiveStatus.ARCHIVED_OK,
    uebMinutesReference: 'Acta No. 08 - 23/02/2026 - Acuerdo 26',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 17,
    ecieInternalCode: 'ECIE 2026-20-13',
    counterpartyContractNumber: 'No. 05/2026',
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'UEB Calzado COMBELL',
    contractTypeCode: 'COMPRAVENTA',
    areaCode: 'CO_COMPRAS_SERV',
    subject: 'Compraventa de calzado y productos autorizados según Anexo 1.',
    uebEntryDate: '2026-02-23',
    legalOpinionDate: '2026-02-23',
    signatureDate: '2026-02-23',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 1000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2027-02-23',
    validityDescription: null,
    approvalStatus: RequestStatus.APPROVED_OK,
    economyArchiveStatus: EconomyArchiveStatus.ARCHIVED_OK,
    uebMinutesReference: 'Acta No. 08 - 23/02/2026 - Acuerdo 27',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 18,
    ecieInternalCode: 'ECIE 2026-20-14',
    counterpartyContractNumber: 'No. 10/2026',
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'UEB Taxi Holguín',
    contractTypeCode: 'TRANSPORTACION',
    areaCode: 'EQ_TRANSP',
    subject:
      'Transportación terrestre de pasajeros, en especial trabajadores de la UEB Holguín vinculados a la inversión del BESS Cueto.',
    uebEntryDate: '2026-02-25',
    legalOpinionDate: '2026-02-24',
    signatureDate: '2026-03-01',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 20000000.0,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2027-03-01',
    validityDescription: null,
    approvalStatus: RequestStatus.PENDING_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.PENDING,
    uebMinutesReference: 'Acta No. 09 - 02/03/2026 - Acuerdo 29',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 19,
    ecieInternalCode: 'ECIE 2026-20-15',
    counterpartyContractNumber: '329.27.26.00',
    instrumentCategory: InstrumentCategory.MASTER_CONTRACT,
    subInstrumentNumber: null,
    parentCode: null,
    counterpartyAcronym: 'INEL',
    contractTypeCode: 'INVESTIGACION',
    areaCode: 'CO_TRANSMISION',
    subject:
      'Contrato General de Investigaciones Ingenieras Aplicadas para proyección, localización y ejecución de obras cuyo alcance se definirá en contratos específicos.',
    uebEntryDate: '2026-02-26',
    legalOpinionDate: '2026-02-25',
    signatureDate: '2026-03-16',
    amountType: AmountType.SUMMATION,
    amount: null,
    validityType: ValidityType.SPECIFIC_DATE,
    expirationDate: '2028-03-16',
    validityDescription: null,
    approvalStatus: RequestStatus.PENDING_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.PENDING,
    uebMinutesReference: 'Acta No. 09 - 02/03/2026 - Acuerdo 30',
    remarks: null,
  },
  {
    registrationYear: 2026,
    consecutiveNumber: 20,
    ecieInternalCode: 'ECIE 2026-20-15-01',
    counterpartyContractNumber: 'Específico No. 01 al Contrato 329.27.26.00',
    instrumentCategory: InstrumentCategory.SPECIFIC_CONTRACT,
    subInstrumentNumber: 1,
    parentCode: 'ECIE 2026-20-15', // Vinculación jerárquica directa con el contrato #19
    counterpartyAcronym: 'INEL',
    contractTypeCode: 'INVESTIGACION',
    areaCode: 'CO_TRANSMISION',
    subject:
      'Investigación Ingeniera Aplicada referente a medición de la malla de tierra a las Subestaciones 220 kV pertenecientes a la UEB Holguín.',
    uebEntryDate: '2026-02-26',
    legalOpinionDate: '2026-02-25',
    signatureDate: '2026-03-16',
    amountType: AmountType.FIXED_AMOUNT,
    amount: 2927396.2,
    validityType: ValidityType.OBLIGATIONS_FULFILLMENT,
    expirationDate: null,
    validityDescription: 'Cumplimiento de las Obligaciones',
    approvalStatus: RequestStatus.PENDING_COMPANY,
    economyArchiveStatus: EconomyArchiveStatus.PENDING,
    uebMinutesReference: 'Acta No. 09 - 02/03/2026 - Acuerdo 31',
    remarks: null,
  },
];
```

### 7.3 `src/modules/contracting/seeds/database-seeder.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommitteeMinute } from '../entities/committee-minute.entity';
import { CommitteeResolution } from '../entities/committee-resolution.entity';
import { ContractRequest } from '../entities/contract-request.entity';
import { ContractType } from '../entities/contract-type.entity';
import { Counterparty } from '../entities/counterparty.entity';
import { SpecializedArea } from '../entities/specialized-area.entity';
import {
  CONTRACT_TYPES_SEED,
  COUNTERPARTIES_SEED,
  SPECIALIZED_AREAS_SEED,
} from './catalogs.seed.data';
import {
  CONTRACT_REQUESTS_SEED,
  MINUTES_SEED,
} from './contracts-and-minutes.seed.data';

/**
 * Servicio idempotente encargado de poblar la base de datos inicial (Seeds).
 * Ejecuta todo el proceso dentro de una transacción ACID garantizando que:
 *  1. Se carguen catálogos base (Tipos, Áreas, Contrapartes).
 *  2. Se inserten primero los Contratos Principales y luego sus Específicos/Suplementos
 *     resolviendo automáticamente el `parentContractId`.
 *  3. Se carguen Actas y Acuerdos vinculándolos por código ECIE a cada solicitud.
 */
@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      this.logger.log('Iniciando carga de catálogos maestros...');

      await manager.upsert(ContractType, CONTRACT_TYPES_SEED, ['code']);
      await manager.upsert(SpecializedArea, SPECIALIZED_AREAS_SEED, ['code']);
      await manager.upsert(Counterparty, COUNTERPARTIES_SEED, ['officialName']);

      const typesMap = new Map(
        (await manager.find(ContractType)).map((t) => [t.code, t]),
      );
      const areasMap = new Map(
        (await manager.find(SpecializedArea)).map((a) => [a.code, a]),
      );
      const counterpartiesMap = new Map(
        (await manager.find(Counterparty)).map((c) => [c.acronym ?? c.officialName, c]),
      );

      this.logger.log('Cargando solicitudes de contrato y resolviendo jerarquías...');
      const requestsByCode = new Map<string, ContractRequest>();

      // Primera pasada: insertar todos los contratos sin padre aún
      for (const item of CONTRACT_REQUESTS_SEED) {
        let req = await manager.findOne(ContractRequest, {
          where: { ecieInternalCode: item.ecieInternalCode },
        });

        if (!req) {
          req = manager.create(ContractRequest, {
            registrationYear: item.registrationYear,
            consecutiveNumber: item.consecutiveNumber,
            ecieInternalCode: item.ecieInternalCode,
            counterpartyContractNumber: item.counterpartyContractNumber,
            instrumentCategory: item.instrumentCategory,
            subInstrumentNumber: item.subInstrumentNumber,
            counterparty: counterpartiesMap.get(item.counterpartyAcronym)!,
            contractType: typesMap.get(item.contractTypeCode)!,
            specializedArea: areasMap.get(item.areaCode)!,
            subject: item.subject,
            uebEntryDate: new Date(item.uebEntryDate),
            legalOpinionDate: item.legalOpinionDate ? new Date(item.legalOpinionDate) : null,
            signatureDate: item.signatureDate ? new Date(item.signatureDate) : null,
            amountType: item.amountType,
            amount: item.amount,
            currency: 'CUP',
            validityType: item.validityType,
            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
            validityDescription: item.validityDescription,
            approvalStatus: item.approvalStatus,
            economyArchiveStatus: item.economyArchiveStatus,
            uebMinutesReference: item.uebMinutesReference,
            remarks: item.remarks,
          });
          req = await manager.save(req);
        }
        requestsByCode.set(req.ecieInternalCode, req);
      }

      // Segunda pasada: enlazar parentContractId para Específicos y Suplementos (Ej: ECIE 2026-20-15-01 -> ECIE 2026-20-15)
      for (const item of CONTRACT_REQUESTS_SEED) {
        if (!item.parentCode) continue;
        const child = requestsByCode.get(item.ecieInternalCode);
        const parent = requestsByCode.get(item.parentCode);
        if (child && parent && !child.parentContractId) {
          child.parentContractId = parent.id;
          await manager.save(child);
        }
      }

      this.logger.log('Cargando Actas y Acuerdos del Comité de Contratación...');
      for (const minuteSeed of MINUTES_SEED) {
        let minute = await manager.findOne(CommitteeMinute, {
          where: { year: minuteSeed.year, minuteNumber: minuteSeed.minuteNumber },
        });

        if (!minute) {
          minute = await manager.save(
            manager.create(CommitteeMinute, {
              year: minuteSeed.year,
              minuteNumber: minuteSeed.minuteNumber,
              sessionDate: new Date(minuteSeed.sessionDate),
            }),
          );
        }

        for (const resSeed of minuteSeed.resolutions) {
          let resolution = await manager.findOne(CommitteeResolution, {
            where: {
              minuteId: minute.id,
              resolutionNumber: resSeed.resolutionNumber,
            },
          });

          if (!resolution) {
            const relatedRequests = resSeed.relatedContractCodes
              .map((code) => requestsByCode.get(code))
              .filter((r): r is ContractRequest => Boolean(r));

            resolution = manager.create(CommitteeResolution, {
              minute,
              agendaItem: resSeed.agendaItem,
              resolutionNumber: resSeed.resolutionNumber,
              description: resSeed.description,
              responsible: resSeed.responsible,
              dueDate: resSeed.dueDate ? new Date(resSeed.dueDate) : null,
              completedDate: resSeed.completedDate ? new Date(resSeed.completedDate) : null,
              status: resSeed.status,
              remarks: resSeed.remarks,
              relatedRequests,
            });
            await manager.save(resolution);
          }
        }
      }

      this.logger.log('Proceso de seeding completado exitosamente.');
    });
  }
}
```