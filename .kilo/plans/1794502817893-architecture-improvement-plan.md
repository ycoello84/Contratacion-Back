# Plan de Mejora Arquitectónica - Sistema de Contratación ECIE

## Resumen Ejecutivo

Este plan define la migración de la arquitectura actual (flat, IDs auto-increment, enums simples, sin transformers) hacia la **Arquitectura Unificada** documentada en `docs/architecture/arquitectura_unificada_entidades_y_seeds_sistema_ecie.md` (DDD-lite, UUID v4, enums ricos con metadatos, transformers decimales, seeds completos, validaciones de negocio transaccionales).

---

## 1. Análisis de Brechas (Gap Analysis)

| Área | Arquitectura Actual | Arquitectura Objetivo | Brecha |
|------|---------------------|----------------------|--------|
| **Identificadores** | `INT` autoincremental | `UUID v4` PK + `registrationYear` + `consecutiveNumber` (único compuesto) | Crítica - Requiere migración de BD y cambio de FKs |
| **Precisión Financiera** | `DECIMAL(14,2)` como `string` sin transformer | `DECIMAL(18,2)` + `DecimalColumnTransformer` (number ↔ string) | Alta - Evita errores de punto flotante |
| **Modelado de Estados** | Enums simples en español (8-10 valores) | Enums estrictos en inglés + metadatos visuales (colorHex, label, order) para Frontend | Media - Requiere nueva capa de presentación |
| **Jerarquía Contractual** | Auto-ref simple + `ContractType` (3 valores) | Auto-ref + `InstrumentCategory` (3) + `subInstrumentNumber` + ejecución acumulada | Alta - Nueva lógica de negocio |
| **Vigencias** | `startDate` + `expirationDate` (solo fechas) | `validityType` (3) + `validFrom` + `expirationDate` + `validityDescription` (texto libre) | Media - Soporta "Cumplimiento Obligaciones" e "Indefinido" |
| **Comité de Contratación** | `Meeting` (1:N) `Agreement` (N:1) `Contract` | `CommitteeMinute` (1:N) `CommitteeResolution` (N:M) `ContractRequest` + responsable/fecha pactada vs real | Alta - Normalización 3FN + trazabilidad cumplimiento |
| **Contrapartes** | `Company` único (origen/destino + UEB) | `Counterparty` dedicado + `LegalNature` (6 tipos) + tax/reeup code + acronym | Alta - Normalización y deduplicación |
| **Catálogos** | Hardcoded en enums/strings | Entidades `SpecializedArea`, `ContractType` con `code`/`name`/`isActive` | Media - CRUD admin futuro |
| **Infraestructura Base** | Sin `BaseEntity`, sin transformers | `BaseEntity` (UUID, timestamps, soft delete) + `DecimalColumnTransformer` | Crítica - Base para todas las entidades |
| **Seeds** | Solo admin user | Catálogos completos + 20 registros reales del Excel 2026 | Alta - Datos de prueba/desarrollo |
| **Capa de Aplicación** | CRUD básico + validaciones simples | DTOs validados + Servicio transaccional con reglas de negocio (jerarquía, coherencia montos) | Media - Robustez empresarial |

---

## 2. Decisiones de Diseño Clave

### 2.1 Estrategia de Migración de IDs
**Decisión**: Migración **Big Bang** (no gradual) porque:
- Las FKs actuales son `INT` y la nueva arquitectura usa `UUID`
- No hay datos de producción que preservar (solo seed admin)
- Simplifica el código: una sola versión de entidades

**Implicación**: `synchronize: true` en desarrollo recreará tablas. En producción se requerirán migraciones TypeORM versionadas.

### 2.2 Convención de Nombrado
**Decisión**: Mantener **inglés** para código (entidades, columnas, DTOs, enums) y **español** para documentación JSDoc, comentarios funcionales y reglas de negocio. Esto alinea con la arquitectura objetivo.

### 2.3 Soft Delete
**Decisión**: Activar `@DeleteDateColumn` en `BaseEntity` para auditoría institucional. Todas las queries deben usar `withDeleted: false` (default en TypeORM con soft delete).

### 2.4 Módulo `contracting` vs Módulos Actuales
**Decisión**: Consolidar `contracts`, `companies`, `meetings`, `agreements` en un único módulo **`contracting`** siguiendo DDD-lite, porque:
- Son agregados del mismo dominio (Contratación)
- Eliminan dependencias circulares actuales (Contract ↔ Meeting ↔ Agreement)
- Simplican transacciones atómicas (ej. crear ContractRequest + vincular Resolution)

**Módulos que permanecen separados**: `auth`, `users`, `workers` (dominios distintos).

---

## 3. Plan de Implementación por Fases

### Fase 0: Preparación y Limpieza (Pre-requisitos)
- [ ] **0.1** Eliminar `ObserveModule` (claves placeholder) de `app.module.ts` - no usado
- [ ] **0.2** Verificar `package.json` tiene dependencias necesarias: `class-transformer`, `class-validator`, `typeorm`, `@nestjs/typeorm`, `reflect-metadata`
- [ ] **0.3** Confirmar Node.js ≥ 18, NestJS ≥ 10, TypeORM ≥ 0.3, MySQL 8.0+

### Fase 1: Infraestructura Base (`common/` y `config/`)
- [ ] **1.1** Crear `src/common/entities/base.entity.ts` con `BaseEntity` (UUID v4, timestamps microsegundos, soft delete)
- [ ] **1.2** Crear `src/common/transformers/decimal.transformer.ts` con `DecimalColumnTransformer`
- [ ] **1.3** Crear `src/config/typeorm.config.ts` centralizado (charset utf8mb4, timezone Z, synchronize solo dev)
- [ ] **1.4** Actualizar `app.module.ts` para usar `TypeOrmModule.forRootAsync` con `typeorm.config.ts`
- [ ] **1.5** Eliminar `configuration.ts` database config duplicado (usar solo env + typeorm.config)

### Fase 2: Enumeraciones de Dominio (`contracting/enums/`)
- [ ] **2.1** Crear `src/modules/contracting/enums/contracting.enums.ts` con todos los enums:
  - `InstrumentCategory` (MASTER_CONTRACT, SPECIFIC_CONTRACT, ADDENDUM)
  - `RequestStatus` (8 estados con flujo completo)
  - `EconomyArchiveStatus` (3 estados)
  - `AmountType` (FIXED_AMOUNT, SUMMATION, NO_VALUE_REFERRED)
  - `ValidityType` (SPECIFIC_DATE, OBLIGATIONS_FULFILLMENT, INDEFINITE)
  - `ResolutionStatus` (PENDING, FULFILLED, UNFULFILLED)
  - `LegalNature` (6 tipos)
  - `REQUEST_STATUS_METADATA` (label, colorHex, order para Frontend)

### Fase 3: Entidades del Dominio (`contracting/entities/`)
- [ ] **3.1** `counterparty.entity.ts` - Reemplaza `Company` para contratación
- [ ] **3.2** `specialized-area.entity.ts` - Catálogo áreas ECIE
- [ ] **3.3** `contract-type.entity.ts` - Catálogo tipologías jurídicas
- [ ] **3.4** `contract-request.entity.ts` - Entidad nuclear (reemplaza `Contract`)
  - PK UUID + índice único compuesto `(registrationYear, consecutiveNumber)`
  - Auto-referencia `parentContract` + `InstrumentCategory` + `subInstrumentNumber`
  - Campos desacoplados: `amountType`/`amount`, `validityType`/`validFrom`/`expirationDate`/`validityDescription`
  - N:M con `CommitteeResolution`
- [ ] **3.5** `committee-minute.entity.ts` - Reemplaza `Meeting` (actas del CC)
- [ ] **3.6** `committee-resolution.entity.ts` - Reemplaza `Agreement` (acuerdos individuales)

### Fase 4: DTOs y Servicio Transaccional (`contracting/dto/`, `contracting/services/`)
- [ ] **4.1** `create-contract-request.dto.ts` - Validación completa con class-validator
- [ ] **4.2** `contract-request.service.ts` - Reglas de negocio:
  - Validar unicidad `ecieInternalCode`
  - Específicos/Suplementos requieren `parentContractId`
  - Coherencia `amountType` vs `amount` (solo FIXED_AMOUNT admite monto)
  - `getMasterContractExecutionSummary()` - suma ejecución contratos derivados
  - `linkResolutionToRequest()` - transaccional idempotente

### Fase 5: Seeds Completos (`contracting/seeds/`)
- [ ] **5.1** `catalogs.seed.data.ts` - 10 ContractTypes, 11 SpecializedAreas, 17 Counterparties
- [ ] **5.2** `contracts-and-minutes.seed.data.ts` - 3 Minutes con 8 Resolutions + 20 ContractRequests reales
- [ ] **5.3** `database-seeder.service.ts` - Servicio idempotente (upsert por código único) ejecutable via CLI o `onModuleInit`

### Fase 6: Módulo `contracting` y Limpieza
- [ ] **6.1** `contracting.module.ts` - Agrupa entidades, DTOs, servicio, seeds
- [ ] **6.2** Registrar `ContractingModule` en `app.module.ts`
- [ ] **6.3** **Eliminar módulos obsoletos**: `contracts`, `companies`, `meetings`, `agreements` (entidades, DTOs, servicios, controladores, tests, módulos)
- [ ] **6.4** Actualizar `app.module.ts` imports (quitar 4 módulos, añadir `ContractingModule`)

### Fase 7: Validación y Pruebas
- [ ] **7.1** Ejecutar `npm run build` - compilar sin errores
- [ ] **7.2** Ejecutar `npm run lint` - ESLint sin errores
- [ ] **7.3** Ejecutar seeds contra MySQL local - verificar 20 contratos + 3 actas + catálogos
- [ ] **7.4** Probar endpoints via Swagger/Postman:
  - POST `/contracting/requests` - crear con validaciones
  - GET `/contracting/requests` - paginación + filtros
  - GET `/contracting/requests/:id/execution-summary` - ejecución acumulada contrato marco
  - POST `/contracting/requests/:id/link-resolution/:resolutionId` - vincular acuerdo
- [ ] **7.5** Verificar soft delete: DELETE no elimina físicamente, `deletedAt` se setea

---

## 4. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Rotura de tests existentes | Alta | Media | Reescribir tests para nueva arquitectura (Fase 7) |
| Pérdida de datos seed admin | Baja | Baja | `seed-admin.ts` se mantiene aparte (módulo `users`) |
| Dependencias circulares en nueva entidad | Media | Alta | DDD-lite: `ContractRequest` importa catálogos, catálogos no importan `ContractRequest` |
| Performance UUID vs INT | Baja | Baja | MySQL 8 optimiza UUID v4; índices compuestos en campos de consulta frecuente |
| Frontend rompe por enums en inglés | Media | Media | Exponer `REQUEST_STATUS_METADATA` via endpoint `/contracting/status-metadata` |

---

## 5. Validación de Compleción (Definition of Done)

El plan se considera completo cuando:

1. ✅ `npm run build` compila sin errores TypeScript
2. ✅ `npm run lint` pasa sin warnings/errors
3. ✅ Seeds poblan BD con 20 contratos, 3 actas, 8 acuerdos, catálogos completos
4. ✅ Endpoints CRUD + business logic responden 200/201 con datos correctos
5. ✅ Validaciones de negocio rechazan casos inválidos (400/409):
   - Específico sin padre
   - SUMMATION con amount
   - Código ECIE duplicado
6. ✅ Soft delete funciona (registro marcado, no borrado físico)
7. ✅ `REQUEST_STATUS_METADATA` expuesto para Frontend

---

## 6. Fuera de Alcance (Out of Scope)

- Migración de datos históricos de producción (no hay)
- Autenticación/autorización (módulo `auth`/`users` intacto)
- Trabajadores/UEB internas (módulo `workers` intacto)
- Frontend / API Gateway / DevOps / CI/CD
- Migraciones TypeORM versionadas para producción (documentar como siguiente paso)

---

## 7. Próximos Pasos Inmediatos

1. **Confirmar** esta estrategia de migración Big Bang
2. **Ejecutar** Fase 0 (limpieza ObserveModule)
3. **Iniciar** Fase 1 (infraestructura base)

---

*Plan generado para implementación por agente de desarrollo. Cada fase es atómica y validable independientemente.*