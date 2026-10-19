# AGENT.md - Arquitectura e Instrucciones del Proyecto

## 1. Visión General del Proyecto
Este backend proporciona una API REST para la gestión integral de contratación, empresas (matrices y UEBs), seguimiento por el Comité de Contratación (CC), reuniones/actas, acuerdos, trabajadores y control de usuarios basado en roles (RBAC).

- **Nombre del Proyecto:** `contratacion-back`
- **Ubicación:** `C:\Storage\Proyectos\BACKEND\Contratacion\contratacion-back`
- **Motor de Base de Datos:** MySQL 8.0 (Docker)
- **Framework Recomendado:** NestJS / Node.js (TypeScript)

---

## 2. Módulos del Sistema y Entidades Enriquecidas

### A. Módulo de Usuarios y Autenticación (`/users`, `/auth`)
Gestiona el acceso al sistema mediante control de acceso basado en roles (RBAC).
- **Atributos de Usuario:** `id`, `email`, `password_hash`, `nombre`, `rol` (`ADMIN`, `GESTOR`, `LECTOR`), `activo`, `createdAt`, `updatedAt`.
- **Funcionalidades:**
  - Autenticación mediante JWT.
  - CRUD de usuarios (acceso restringido a administradores).
  - Middleware / Guards de verificación de roles.

### B. Módulo de Empresas (`/companies`)
Gestiona tanto a las empresas matrices como a sus distintas Unidades Empresariales de Base (UEB).
- **Atributos:**
  - `id`: UUID / Auto-incremental.
  - `razon_social`: Nombre oficial de la entidad.
  - `siglas`: Nombre abreviado / comercial *(ej. "GEYSEL", "SEPSA", "ATI")*.
  - `identificacion_fiscal`: RUT / CIF / NIF / REUP.
  - `direccion`: Dirección física de la empresa.
  - `telefono`, `email_contacto`.
  - `es_ueb`: Boolean (`true` si la entidad es una UEB).
  - `parent_empresa_id`: Relación autoreferenciada N:1 hacia la empresa matriz (si `es_ueb` es `true`).
  - `createdAt`, `updatedAt`.

### C. Módulo de Contratos y Suplementos (`/contracts`)
Gestiona contratos principales, específicos y suplementos con sus respectivos dictámenes y flujos del Comité de Contratación (CC).
- **Atributos:**
  - `id`: Identificador principal.
  - `no_contrato`: Código o número interno asignado *(ej. `ECIE 2026-20-01`)*.
  - `tipo_relacion_contractual`: Enum (`CONTRATO_PRINCIPAL`, `CONTRATO_ESPECIFICO`, `SUPLEMENTO`).
  - `contrato_padre_id`: Relación autoreferenciada N:1 (Apunta al Contrato Principal si es Suplemento o Específico).
  - `objeto`: Descripción o resumen del servicio / suministro contratado.
  - `empresa_origen_id`: Relación N:1 con `Companies` (Entidad Contratante).
  - `empresa_destino_id`: Relación N:1 con `Companies` (Entidad Contratada / Proveedor).
  - `area_especializada`: Área / Departamento solicitante *(ej. "Construcción e Inversiones", "Transporte", "CO Compras y Servicios")*.
  - `valor`: Decimal (Monto o importe total del contrato).
  - `sin_valor_refiere`: Boolean (Indica si es un contrato marco o no posee un valor económico definido en la firma).
  - `fecha_entrada_ueb`: Fecha en que ingresó la solicitud a la UEB.
  - `fecha_emision_dictamen`: Fecha de emisión del dictamen legal.
  - `fecha_inicio`, `fecha_vencimiento`.
  - `estado_aprobacion_cc`: Enum con los estados exactos del Comité de Contratación:
    - `APROBADO_Y_OK`
    - `APROBADO_EMPRESA`
    - `PENDIENTE_APROBACION_EMPRESA`
    - `NO_APROBADO_CC_EMPRESA`
    - `NO_APROBADO_CC_UEB`
    - `CANCELADO`
    - `FALTAN_DATOS`
    - `ARCHIVADO_ECONOMIA`
  - `acta_cc_id`: Relación N:1 opcional hacia la sesión/acta del Comité de Contratación.
  - `createdAt`, `updatedAt`.

### D. Módulo de Trabajadores (`/workers`)
Gestiona el personal del sistema, su empresa asociada y su pertenencia al Comité de Contratación.
- **Atributos:**
  - `id`: Identificador único.
  - `nombre_completo`: Nombres y apellidos.
  - `cargo`: Puesto en la empresa.
  - `email`: Correo electrónico.
  - `empresa_id`: Relación N:1 con `Companies` (opcional).
  - `es_miembro_cc`: Boolean (Indica si forma parte activa del Comité de Contratación).
  - `cargo_cc`: Rol interno en el comité *(ej. "Presidente", "Secretario", "Vocal")*.
  - `createdAt`, `updatedAt`.

### E. Módulo de Reuniones de Comité de Contratación (`/meetings`)
Gestiona las sesiones del Comité de Contratación (CC) y las actas correspondientes.
- **Atributos de `ReunionCC` / `ActaCC`:**
  - `id`: Identificador principal.
  - `numero_acta`: Número correlativo de la sesión *(ej. `Acta No. 01`)*.
  - `fecha_reunion`: Fecha y hora de celebración del CC.
  - `orden_del_dia`: Texto descriptivo de los puntos de la reunión.
  - `createdAt`, `updatedAt`.
- **Relaciones:**
  - Participantes / Asistentes: Relación M:N con `Workers` mediante la tabla intermedia `meeting_workers`.
  - Contratos evaluados: Relación 1:N con `Contracts`.
  - Acuerdos adoptados: Relación 1:N con `AcuerdosCC`.

### F. Módulo de Acuerdos del Comité (`/agreements`)
Registra el cumplimiento de los acuerdos derivados de las sesiones del Comité de Contratación.
- **Atributos:**
  - `id`: Identificador único.
  - `numero_acuerdo`: Código del acuerdo *(ej. `Acuerdo 02-2026`)*.
  - `acta_cc_id`: Relación N:1 con `Meetings` (Acta origen).
  - `contrato_id`: Relación N:1 opcional con `Contracts`.
  - `punto`: Punto de la orden del día correspondiente.
  - `detalle`: Descripción del compromiso o decisión tomada.
  - `responsable_id`: Relación N:1 con `Workers` (Trabajador encargado del seguimiento).
  - `fecha_cumplimiento`: Límite máximo para cumplir el acuerdo.
  - `estado_cumplimiento`: Enum (`CUMPLIDO`, `NO_CUMPLIDO`, `PENDIENTE`).
  - `createdAt`, `updatedAt`.

---

## 3. Diagrama Entidad-Relación (E-R)

```
[Companies] (Matriz) ── (1:N) ──> [Companies] (UEB)
     │                                │
     ├── (1:N) (Empresa Origen) ──────┤
     └── (1:N) (Empresa Destino) ─────┼──> [Contracts] ◄─── (1:N) ─── [Contracts] (Suplemento / Específico)
                                            │
   [Workers] ◄─── (N:1) (Responsable) ──────┼──────────────┐
       │                                    │              │
       ├── (N:M) (Asistentes)               ├── (N:1)      │ (1:N)
       │                                    ▼              │
       └───────────────> [Meetings] ─── (1:N) ───> [AcuerdosCC]
```

---

## 4. Estructura de Directorios Recomendada (NestJS / Modular)

```
src/
├── common/                # Guards, Decorators, Filters, Interceptors
│   ├── decorators/
│   ├── filters/
│   └── guards/
├── config/                # Configuración de base de datos y entorno
├── modules/
│   ├── auth/              # Autenticación y estrategias JWT
│   ├── users/             # Gestión de usuarios y RBAC
│   ├── companies/         # Empresas y UEBs
│   ├── contracts/         # Contratos, suplementos y flujos CC
│   ├── workers/           # Trabajadores y miembros del CC
│   ├── meetings/          # Sesiones de Comité y Actas
│   └── agreements/        # Acuerdos del Comité y seguimiento
├── app.module.ts
└── main.ts
```

---

## 5. Reglas y Convenciones de Desarrollo
1. **Validación de Entradas:** Utilizar siempre DTOs (`Data Transfer Objects`) con `class-validator` y `class-transformer`.
2. **Tipado:** Tipado estricto en TypeScript. Evitar el uso de `any`.
3. **Manejo de Errores:** Retornar excepciones HTTP estándar (`NotFoundException`, `BadRequestException`, `UnauthorizedException`).
4. **Base de Datos:**
   - Mantener migraciones explícitas o usar TypeORM/Prisma de manera estructurada.
   - Definir llaves foráneas e índices en campos clave (`email`, `identificacion_fiscal`, `estado_aprobacion_cc`, `no_contrato`).