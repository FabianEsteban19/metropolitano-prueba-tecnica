// ============================================================
// Tipos del dominio Metropolitano (Lima, Perú)
// Espejo 1-a-1 del schema PostgreSQL del backend NestJS.
//
//   Tablas:
//     - rutas              (servicio enum)
//     - estaciones
//     - ruta_estaciones    (N:M con orden)
//     - buses              (estado enum)
//     - reportes           (validación capacidad por trigger)
//     - usuarios           (rol enum)
//
//   IDs: BIGSERIAL → number en TS (los genera la BD).
//   Enums: tipos string union espejo de los ENUM de PostgreSQL.
// ============================================================

// ---------- ENUMS (espejo de PostgreSQL) ----------

/** ENUM `bus_estado` */
export type BusEstado =
  | "en_ruta"
  | "en_estacion"
  | "fuera_servicio"
  | "retraso";

export const BUS_ESTADOS: BusEstado[] = [
  "en_ruta",
  "en_estacion",
  "fuera_servicio",
  "retraso",
];

/** ENUM `servicio_tipo` */
export type ServicioTipo =
  | "Regular"
  | "Expreso_1"
  | "Expreso_2"
  | "Expreso_4"
  | "Expreso_5"
  | "Expreso_7"
  | "SuperExpreso"
  | "Alimentador";

export const SERVICIO_TIPOS: ServicioTipo[] = [
  "Regular",
  "Expreso_1",
  "Expreso_2",
  "Expreso_4",
  "Expreso_5",
  "Expreso_7",
  "SuperExpreso",
  "Alimentador",
];

/** ENUM `usuario_rol` */
export type UsuarioRol = "admin" | "operador" | "supervisor";

export const USUARIO_ROLES: UsuarioRol[] = ["admin", "operador", "supervisor"];

// ============================================================
// Entidades de la BD
// ============================================================

/** Tabla `rutas` */
export interface Ruta {
  id: number;
  codigo: string;          // único: "A","B","C","REG","SE"
  nombre: string;
  servicio: ServicioTipo;
  color: string;           // "#E30613" o "hsl(...)"
  frecuencia_min: number;

  // ---- Conveniencia frontend (no persistido en `rutas`) ----
  /** IDs de estaciones ordenadas (proviene de `ruta_estaciones.orden`) */
  estacion_ids?: number[];
  descripcion?: string;
  horarios?: {
    lun_vie: { start: string; end: string };
    sabado:  { start: string; end: string };
    domingo: { start: string; end: string };
  };
}

/** Tabla `estaciones` */
export interface Estacion {
  id: number;
  nombre: string;
  distrito: string;
  latitud: number;
  longitud: number;
  orden: number;
}

/** Tabla `buses` */
export interface Bus {
  id: number;
  codigo: string;          // único, ej. "METRO-001"
  capacidad: number;       // > 0
  placa: string | null;    // único, opcional en BD
  ruta_id: number | null;  // FK → rutas.id
  estado: BusEstado;       // ENUM bus_estado, default 'fuera_servicio'
  created_at: string;      // ISO timestamptz

  // ---- Vista enriquecida (vista v_ultimo_estado_bus) ----
  ultimo_reporte?: Reporte | null;
}

/** Tabla `reportes` */
export interface Reporte {
  id: number;
  bus_id: number;                    // FK → buses.id
  latitud: number;                   // -90..90
  longitud: number;                  // -180..180
  cantidad_pasajeros: number;        // ≥ 0, ≤ buses.capacidad (trigger)
  timestamp: string;                 // ISO timestamptz
  estacion_id: number | null;        // FK → estaciones.id
  ocupacion_pct: number | null;      // calculado por trigger (0..100)
  velocidad_kmh: number | null;
}

/** Tabla `usuarios` */
export interface Usuario {
  id: number;
  email: string;
  nombre: string | null;
  rol: UsuarioRol;
  created_at: string;
  // password_hash NUNCA llega al frontend
}

// ============================================================
// DTOs (lo que el frontend envía al backend NestJS)
// ============================================================

export interface CreateBusDto {
  codigo: string;
  capacidad: number;
  placa?: string | null;
  ruta_id?: number | null;
  estado?: BusEstado;
}

export interface UpdateBusDto {
  codigo?: string;
  capacidad?: number;
  placa?: string | null;
  ruta_id?: number | null;
  estado?: BusEstado;
}

export interface CreateReporteDto {
  bus_id: number;
  latitud: number;
  longitud: number;
  cantidad_pasajeros: number;
  estacion_id?: number | null;
  velocidad_kmh?: number | null;
}

export interface CreateRutaDto {
  codigo: string;
  nombre: string;
  servicio: ServicioTipo;
  color: string;
  frecuencia_min: number;
}
export type UpdateRutaDto = Partial<CreateRutaDto>;

export interface CreateEstacionDto {
  nombre: string;
  distrito: string;
  latitud: number;
  longitud: number;
  orden: number;
}
export type UpdateEstacionDto = Partial<CreateEstacionDto>;

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: Usuario;
}

// ============================================================
// Wrappers de respuesta y paginación (estilo NestJS)
// ============================================================

export interface ApiError {
  code: string;          // "VALIDATION" | "NOT_FOUND" | "DUPLICATE" | "CAPACITY_EXCEEDED" | ...
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================================
// Vista pública en vivo (legado del portal /)
// ============================================================
export interface BusLiveView {
  id: number;
  placa: string | null;
  codigo: string;
  ruta_id: number | null;
  capacidad: number;
  ocupacion_actual: number;
  estado: BusEstado;
  estacion_actual_id: number | null;
  estacion_siguiente_id: number | null;
  progreso: number;             // 0..1 dentro del segmento
  velocidad_kmh: number;
  eta_minutos: number;
  ultima_actualizacion: string;
  latitud: number;
  longitud: number;
  direccion: "norte" | "sur";
}

export interface LiveUpdate {
  buses: BusLiveView[];
  timestamp: string;
}

export interface ScheduleEntry {
  ruta_id: number;
  estacion_id: number;
  llegadas: string[]; // ["05:00","05:04",...]
}
