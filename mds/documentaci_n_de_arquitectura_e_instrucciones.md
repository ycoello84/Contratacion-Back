# AGENT.md - Arquitectura e Instrucciones del Proyecto

## 1. Visión General del Proyecto
Este backend proporciona una API REST para la gestión integral de contratación, empresas, reuniones, trabajadores y control de usuarios basado en roles.

- **Nombre del Proyecto:** `contratacion-back`
- **Ubicación:** `C:\Storage\Proyectos\BACKEND\Contratacion\contratacion-back`
- **Motor de Base de Datos:** MySQL 8.0 (Docker)
- **Framework Recomendado:** NestJS / Node.js (TypeScript)

---

## 2. Modulos del Sistema y Entidades

### A. Módulo de Usuarios y Autenticación (`/users`, `/auth`)
Gestiona el acceso al sistema mediante control de acceso basado en roles (RBAC).
- **Atributos de Usuario:** `id`, `email`, `password_hash`, `nombre`, `rol` (`ADMIN`, `GESTOR`, `LECTOR`), `activo`, `createdAt`, `updatedAt`.
- **Funcionalidades:**
  - Autenticación mediante JWT.
  - CRUD de usuarios (acceso restringido a administradores).
  - Middleware / Guards de verificación de roles.

### B. Módulo de Empresas (`/companies`)
Gestiona las entidades comerciales que celebran contratos.
- **Atributos:** `id`, `razon_social`, `identificacion_fiscal` (RUT/CIF/NIF), `direccion`, `telefono`, `email_contacto`, `createdAt`, `updatedAt`.
- **Relaciones:**
  - Una empresa puede ser contratante o contratista en uno o varios **Contratos**.

### C. Módulo de Contratos (`/contracts`)
Gestiona el ciclo de vida de los acuerdos contractuales entre empresas.
- **Atributos:** `id`, `codigo`, `titulo`, `descripcion`, `empresa_origen_id`, `empresa_destino_id`, `fecha_inicio`, `fecha_vencimiento`, `estado`, `createdAt`, `updatedAt`.
- **Estados del Contrato (`enum`):**
  - `PENDIENTE_FIRMA`
  - `FIRMADO`
  - `ENVIADO_A_REVISAR`
  - `CANCELADO`
  - `VENCIDO`
- **Relaciones:**
  - Pertenece a una Empresa Emisora (`empresa_origen_id`) y a una Empresa Receptora (`empresa_destino_id`).

### D. Módulo de Trabajadores (`/workers`)
Gestiona el personal mínimo involucrado en las sesiones o reuniones de seguimiento.
- **Atributos:** `id`, `nombre_completo`, `cargo`, `email`, `empresa_id` (opcional), `createdAt`, `updatedAt`.
- **Relaciones:**
  - Participa en **Reuniones** (Relación N:M).

### E. Módulo de Reuniones (`/meetings`)
Gestiona minutas, convocatorias y seguimiento entre partes.
- **Atributos:** `id`, `titulo`, `fecha_hora`, `temas_tratados` (Text/JSON), `contrato_id` (opcional), `createdAt`, `updatedAt`.
- **Relaciones:**
  - Relación N:M con **Trabajadores** (`meeting_workers`).
  - Asociación opcional a un **Contrato**.

---

## 3. Diagrama de Entidad-Relación (E-R)

```
[Users] ------------ (Gestiona el sistema por Roles)

[Companies] 1 <----+ (Empresa Origen)
            1 <----+ (Empresa Destino) -- [Contracts]
                                              |
[Workers] N <---- (meeting_workers) ----> M [Meetings]
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
│   ├── auth/              # Login, JWT strategies
│   ├── users/             # CRUD de usuarios y roles
│   ├── companies/         # Módulo de Empresas
│   ├── contracts/         # Módulo de Contratos
│   ├── workers/           # Módulo de Trabajadores
│   └── meetings/          # Módulo de Reuniones
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
   - Definir llaves foráneas e índices en campos clave (`email`, `identificacion_fiscal`, `estado`).