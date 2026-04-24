import type { CreateReporteRequest, Estacion, Reporte, RutaEstacion, UUID } from "@/api/types";

export type TrackingLocationSource = "geolocation" | "simulation";

export type TrackingLocation = {
  latitud: number;
  longitud: number;
  timestamp: string;
  velocidadKmh: number | null;
  accuracyMeters: number | null;
  source: TrackingLocationSource;
};

export type RouteStation = RutaEstacion & {
  estacion: Estacion;
};

export type RouteStationDistance = RouteStation & {
  distanceMeters: number;
};

export type TrackingReport = {
  payload: CreateReporteRequest;
  response: Reporte;
  location: TrackingLocation;
  nearestStation: RouteStationDistance | null;
  nextStation: RouteStation | null;
};

export type BusTrackingConfig = {
  busId: UUID;
  rutaId: UUID;
  intervalMs: number;
  proximityRadiusMeters: number;
  useSimulation: boolean;
  cantidadPasajeros: number;
  ocupacionPct: number | null;
  velocidadKmh: number | null;
};

export type SimulationState = {
  segmentIndex: number;
  progressIndex: number;
};
