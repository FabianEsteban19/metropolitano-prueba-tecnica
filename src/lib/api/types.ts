// ============================================================
// Tipos del dominio Metropolitano (Lima, Perú)
// ============================================================

export type ServiceType = "Regular" | "Expreso 1" | "Expreso 2" | "Expreso 4" | "Expreso 5" | "Expreso 7" | "SuperExpreso" | "Alimentador";

export type BusStatus = "en_ruta" | "en_estacion" | "fuera_servicio" | "retraso";

export interface Station {
  id: string;
  name: string;
  /** Orden a lo largo del corredor (0 = Naranjal, último = Matellini) */
  order: number;
  district: string;
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  code: string;             // Ej: "A", "B", "C", "Regular"
  name: string;             // Ej: "Expreso 1"
  service: ServiceType;
  color: string;            // hsl o hex usado en mapas
  description: string;
  stationIds: string[];     // ids de Station en orden
  operatingHours: {
    weekday: { start: string; end: string };
    saturday: { start: string; end: string };
    sunday: { start: string; end: string };
  };
  frequencyMinutes: number; // frecuencia promedio
}

export interface Bus {
  id: string;
  plate: string;            // Placa
  routeId: string;
  capacity: number;         // máximo aforo
  currentOccupancy: number; // ocupación actual
  status: BusStatus;
  /** Estación actual o más cercana */
  currentStationId: string;
  /** Próxima estación */
  nextStationId: string | null;
  /** Progreso entre estación actual y siguiente (0..1) */
  progress: number;
  /** Velocidad km/h */
  speed: number;
  /** ETA a próxima estación en minutos */
  etaMinutes: number;
  lastUpdate: string;       // ISO date
  lat: number;
  lng: number;
  direction: "norte" | "sur";
}

export interface ScheduleEntry {
  routeId: string;
  stationId: string;
  arrivals: string[]; // HH:mm
}

export interface LiveUpdate {
  buses: Bus[];
  timestamp: string;
}
