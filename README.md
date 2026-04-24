# 🚌 Metropolitano MVP — Monitoreo de Flota en Tiempo Real

> **Proyecto construido con [Lovable](https://lovable.dev)** ⚡
> Plataforma de IA para generar aplicaciones web full-stack mediante prompts en lenguaje natural.

Aplicativo web que digitaliza el monitoreo de la flota del **Metropolitano de Lima**, permitiendo visibilidad en tiempo real de los buses, control de ocupación de pasajeros y estimación de tiempos de llegada a estaciones.

---

## 📌 Sobre este proyecto

Este MVP fue **maquetado y desarrollado con Lovable**, un agente de IA que construye aplicaciones React + TypeScript de manera iterativa a través de conversación. Lovable se encargó de:

- Generación del frontend (React 18 + Vite + Tailwind + shadcn/ui)
- Estructura modular por features (`/features`, `/pages/admin`, `/components`)
- Mock API en cliente que **espeja 1-a-1** el contrato del backend NestJS
- Sistema de autenticación, rutas protegidas y CRUDs maquetados
- Diseño responsive con design system basado en tokens HSL semánticos

> El **backend real** está desarrollado de forma independiente en **NestJS + PostgreSQL** y se conecta vía la variable `VITE_METROPOLITANO_API_URL`.

---

## 🎯 Contexto del caso

Una empresa de transporte público tipo Metropolitano busca digitalizar el monitoreo de su flota. Actualmente **no cuenta con**:

- ❌ Visibilidad en tiempo real de sus buses
- ❌ Conocimiento de la cantidad de pasajeros por unidad
- ❌ Estimación de tiempos de llegada a las estaciones

Se requiere un **MVP funcional** que comience a resolver estos problemas mediante una API REST, una base de datos relacional y un frontend con estructura modular.

---

## ✅ Alcance del proyecto (MVP)

### Funcionalidades obligatorias

| Módulo | Descripción |
|---|---|
| **Gestión de buses** | CRUD completo: crear, editar, deshabilitar, listar con paginación y filtros |
| **Gestión de rutas** | CRUD de rutas con código, servicio (Regular/Expreso/Alimentador), color y frecuencia |
| **Gestión de estaciones** | CRUD de estaciones con coordenadas (lat/lng), distrito y orden |
| **Registro de reportes** | Captura de posición, pasajeros, velocidad y estación de cada bus |
| **Autenticación** | Login con email/contraseña, roles (`admin`, `operador`, `supervisor`) |
| **API REST documentada** | Contrato espejo de los endpoints NestJS (`ApiResponse<T>`, `Paginated<T>`) |

### Funcionalidades adicionales implementadas (plus de evaluación)

- ✅ **Simulación automática de movimiento** de buses en el mock
- ✅ **Cálculo de ocupación en %** (validado por trigger en BD)
- ✅ **Filtros**: por estado (en ruta, en estación, fuera de servicio, retraso), por ruta, por ocupación
- ✅ **Endpoint de historial por bus** con paginación
- ✅ **Visualización en mapa** con Leaflet (`FleetMap`) — buses en vivo georreferenciados

---

## 🏗️ Arquitectura

### Frontend (este repositorio — generado con Lovable)

```
src/
├── pages/
│   ├── Index.tsx                  # Vista pública (landing del Metropolitano)
│   └── admin/                     # Panel interno protegido
│       ├── AdminLogin.tsx
│       ├── AdminLayout.tsx
│       ├── Dashboard.tsx          # KPIs + mapa en vivo
│       ├── BusesPage.tsx          # CRUD buses
│       ├── RutasPage.tsx          # CRUD rutas
│       ├── EstacionesPage.tsx     # CRUD estaciones
│       ├── ReportesPage.tsx       # Registro de reportes
│       └── HistorialPage.tsx      # Historial por bus + filtros
├── components/
│   ├── admin/FleetMap.tsx         # Mapa Leaflet con buses en vivo
│   └── metropolitano/             # Componentes vista pública
├── lib/
│   ├── api/                       # Cliente HTTP + mock + tipos espejo BD
│   └── auth/                      # Contexto, rutas protegidas, storage
└── features/                      # Lógica por dominio (bus-tracking, public-transit)
```

### Backend (separado — NestJS)

- **Framework**: NestJS
- **BD**: PostgreSQL con `BIGSERIAL` IDs y `ENUM` nativos
- **Tablas**: `rutas`, `estaciones`, `ruta_estaciones`, `buses`, `reportes`, `usuarios`
- **Reglas de negocio en BD**: trigger `validar_capacidad_reporte` calcula `ocupacion_pct`
- **Vista**: `v_ultimo_estado_bus` (`DISTINCT ON`) para último estado de cada unidad

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| **Build** | Vite 5 + SWC |
| **UI** | React 18 + TypeScript 5 |
| **Estilos** | Tailwind CSS v3 + shadcn/ui (Radix) |
| **Estado servidor** | TanStack Query |
| **Formularios** | react-hook-form + Zod |
| **Routing** | React Router v6 |
| **Mapas** | Leaflet + react-leaflet |
| **HTTP** | Axios |
| **Tests** | Vitest + Testing Library |

---

## 🚀 Cómo correr el proyecto

```bash
# Instalar dependencias
bun install

# Modo desarrollo (mock activo por defecto)
bun run dev

# Build de producción
bun run build

# Tests
bun run test
```

### Variables de entorno

```env
# URL del backend NestJS (si está vacío, usa el mock interno)
VITE_METROPOLITANO_API_URL=http://localhost:3000
```

---

## 🔐 Credenciales seed (modo mock)

| Rol | Email | Password |
|---|---|---|
| Admin | `admin@metropolitano.pe` | `admin123` |
| Supervisor | `supervisor@metropolitano.pe` | `super123` |

---

## 📡 Endpoints REST (contrato con NestJS)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Login con email/password |
| `GET` | `/buses?page=&filters=` | Listar buses paginado |
| `POST` | `/buses` | Crear bus |
| `PATCH` | `/buses/:id` | Editar bus |
| `DELETE` | `/buses/:id` | Deshabilitar bus |
| `GET` | `/buses/:id/historial` | Historial de reportes |
| `GET` | `/rutas` · `POST` · `PATCH` · `DELETE` | CRUD rutas |
| `GET` | `/estaciones` · `POST` · `PATCH` · `DELETE` | CRUD estaciones |
| `POST` | `/reportes` | Registrar reporte (valida capacidad) |
| `GET` | `/live` | Vista en vivo de toda la flota |

Todas las respuestas siguen el wrapper:

```ts
ApiResponse<T> = { ok: boolean; data?: T; error?: ApiError }
Paginated<T>    = { items: T[]; total: number; page: number; page_size: number }
```

---

## 📝 Notas sobre el desarrollo con Lovable

- **Iterativo**: cada funcionalidad se construyó conversando con el agente
- **Frontend-first**: el mock permite desarrollar UI sin esperar al backend
- **Contratos espejo**: los tipos TS reflejan exactamente el schema PostgreSQL
- **Modular**: separación clara entre vista pública y panel interno

---

## 📄 Licencia

Proyecto académico / MVP de evaluación.
Construido con ❤️ usando [Lovable](https://lovable.dev).
