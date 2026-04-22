// ============================================================
// Tipos del dominio Metropolitano (Lima, Perú)
// ============================================================

export type ServiceType = "Regular" | "Expreso 1" | "Expreso 2" | "Expreso 4" | "Expreso 5" | "Expreso 7" | "SuperExpreso" | "Alimentador";

export type BusStatus = "en_ruta" | "en_estacion" | "fuera_servicio" | "retraso";

export interface Station {
  id: string;
  name: string;
  order: number;
  district: string;
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  code: string;
  name: string;
  service: ServiceType;
  color: string;
  description: string;
  stationIds: string[];
  operatingHours: {
    weekday: { start: string; end: string };
    saturday: { start: string; end: string };
    sunday: { start: string; end: string };
  };
  frequencyMinutes: number;
}

// ============================================================
// Entidades del MVP — alineadas al enunciado
// ============================================================

/**
 * Bus — entidad mínima del enunciado.
 * Campos extra (routeId, plate, status, etc.) son metadatos del MVP avanzado.
 */
export interface Bus {
  id: string;
  codigo: string;          // "código" del enunciado (ej. METRO-001)
  capacidad: number;       // capacidad máxima
  // ---- extras MVP ----
  routeId: string;
  plate: string;
  status: BusStatus;
  /** Estado derivado del último reporte */
  ultimoReporte?: Reporte | null;
  createdAt: string;
}

/**
 * Reporte — entidad mínima del enunciado.
 * id, bus_id, latitud, longitud, cantidad_pasajeros, timestamp.
 */
export interface Reporte {
  id: string;
  busId: string;
  latitud: number;
  longitud: number;
  cantidadPasajeros: number;
  timestamp: string;
  // ---- extras útiles ----
  /** Estación más cercana al momento del reporte */
  estacionId?: string | null;
  /** % calculado contra la capacidad (0..100) */
  ocupacionPct?: number;
  velocidadKmh?: number;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

// Live update legacy
export interface LiveUpdate {
  buses: BusLiveView[];
  timestamp: string;
}

/** Vista enriquecida del bus para la UI pública/live */
export interface BusLiveView {
  id: string;
  plate: string;
  routeId: string;
  capacity: number;
  currentOccupancy: number;
  status: BusStatus;
  currentStationId: string;
  nextStationId: string | null;
  progress: number;
  speed: number;
  etaMinutes: number;
  lastUpdate: string;
  lat: number;
  lng: number;
  direction: "norte" | "sur";
}

export interface ScheduleEntry {
  routeId: string;
  stationId: string;
  arrivals: string[];
}
