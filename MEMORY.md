# MEMORY.md - Historial de Cambios y Progreso

## [2026-10-19] - Alineación Completa de Arquitectura (V2 Enriquecida según AGENT.md)

### Cambios realizados:
1. **Módulo de Empresas (`/companies`):**
   - Incorporación de los atributos `siglas`, `es_ueb` y la relación autorreferenciada `parent_empresa_id` (`parentEmpresa` / `uebs`).
   - Actualización de `CreateCompanyDto`, `UpdateCompanyDto` y `FindCompaniesQueryDto` con soporte para filtrado por UEBs y empresa matriz.
   - Validaciones en `CompaniesService` para verificar la existencia de la empresa matriz y evitar autorreferencias circulares.

2. **Módulo de Trabajadores (`/workers`):**
   - Agregados los campos `es_miembro_cc` (booleano) y `cargo_cc` (rol en el Comité de Contratación: Presidente, Secretario, Vocal, etc.).
   - Actualización de los DTOs de creación, edición y búsqueda con filtro `esMiembroCc`.

3. **Módulo de Reuniones de Comité de Contratación (`/meetings`):**
   - Refactorizado al modelo de Sesiones/Actas del CC con `numero_acta`, `fecha_reunion` y `orden_del_dia`.
   - Soporte para relaciones:
     - Participantes / Asistentes (M:N con `Workers` mediante `meeting_workers`).
     - Contratos evaluados (1:N con `Contracts`).
     - Acuerdos adoptados (1:N con `Agreements`).

4. **Módulo de Contratos y Suplementos (`/contracts`):**
   - Migración completa de la estructura obsoleta V1 a la especificación enriquecida V2:
     - `no_contrato`: Código o número asignado (único).
     - `tipo_relacion_contractual`: Enum (`CONTRATO_PRINCIPAL`, `CONTRATO_ESPECIFICO`, `SUPLEMENTO`).
     - `contrato_padre_id`: Relación autoreferenciada N:1 hacia el contrato principal con validación obligatoria para suplementos y específicos.
     - `objeto`: Texto descriptivo del contrato.
     - `area_especializada`: Departamento o área solicitante.
     - `valor`: Decimal monetario con soporte para montos específicos.
     - `sin_valor_refiere`: Booleano para contratos marco o sin valor determinado en la firma.
     - `fecha_entrada_ueb` y `fecha_emision_dictamen`.
     - `estado_aprobacion_cc`: Enum con los 8 estados exactos del Comité (`APROBADO_Y_OK`, `APROBADO_EMPRESA`, `PENDIENTE_APROBACION_EMPRESA`, `NO_APROBADO_CC_EMPRESA`, `NO_APROBADO_CC_UEB`, `CANCELADO`, `FALTAN_DATOS`, `ARCHIVADO_ECONOMIA`).
     - `acta_cc_id`: Asociación N:1 con el acta del CC correspondiente.
   - Eliminación de archivos obsoletos de estados (`contract-status.enum.ts` y `contract-status.transitions.ts`).

5. **Nuevo Módulo de Acuerdos del Comité (`/agreements`):**
   - Creación completa del módulo con `AgreementsModule`, `AgreementsController`, `AgreementsService` y la entidad `Agreement`.
   - Atributos: `numero_acuerdo`, `acta_cc_id`, `contrato_id`, `punto`, `detalle`, `responsable_id`, `fecha_cumplimiento`, `estado_cumplimiento` (`CUMPLIDO`, `NO_CUMPLIDO`, `PENDIENTE`).
   - Registro en `AppModule` con control de acceso por roles (RBAC).

6. **Pruebas, Configuración y Calidad de Código:**
   - Corrección de pruebas unitarias en `AppController` (`getInfo()` y `getHealth()`) y pruebas de integración e2e.
   - Adición de pruebas unitarias para `AgreementsService`.
   - Eliminación de la directiva obsoleta `version: '3.8'` en `docker-compose.yml`.
   - Creación de `.env.example` con la plantilla de configuración recomendada.
   - Verificación de compilación limpia (`pnpm run build`) y validación estricta con linter (`oxlint --type-aware`: 0 errores, 0 warnings en 72 archivos).
   - **Corrección de dependencias circulares en ESM:** Aplicación de `Relation<T>` de TypeORM en todas las relaciones de entidades (`Agreement`, `Meeting`, `Contract`, `Company`, `Worker`) para evitar `ReferenceError: Cannot access 'X' before initialization` causado por `emitDecoratorMetadata` en módulos ES (`"type": "module"`).
   - **Resolución de conflicto de migración TypeORM en MySQL 8:** Limpieza de filas de prueba de la versión anterior en `meetings` y `contracts` para permitir la sincronización de columnas `NOT NULL` sin colisionar con el modo estricto `NO_ZERO_DATE` de MySQL.
   - Integración de documentación Swagger en `/docs` vía `@nestjs/swagger`.

---

## [2026-10-19] - Configuración Inicial
- **Cambios realizados:**
  - Creación del fichero `docker-compose.yml` para levantar la base de datos MySQL 8.0.
  - Resolución de conflicto en el puerto `3306` de la máquina host (mapeo a `3307:3306`).
- **Notas técnicas:**
  - Configuración inicial de TypeORM y entorno modular NestJS.