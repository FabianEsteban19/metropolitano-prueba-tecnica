import type { BaseResponseDto, Estacion, RutaEstacion } from "@/api/types";
import { apiClient, unwrapResponseData } from "@/lib/api/httpClient";

import type { RouteStation } from "../types";

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeEstacion(raw: Record<string, unknown>): Estacion {
  return {
    id: String(raw.id ?? ""),
    nombre: String(raw.nombre ?? ""),
    distrito: String(raw.distrito ?? ""),
    latitud: toNumber(raw.latitud),
    longitud: toNumber(raw.longitud),
    orden: toNumber(raw.orden),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  };
}

function normalizeRutaEstacion(raw: Record<string, unknown>): RutaEstacion {
  return {
    rutaId: String(raw.rutaId ?? raw.ruta_id ?? ""),
    estacionId: String(raw.estacionId ?? raw.estacion_id ?? ""),
    orden: toNumber(raw.orden, 0),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  };
}

export const trackingRutaEstacionesApi = {
  async listByRuta(rutaId: string): Promise<RouteStation[]> {
    const [routeStationsResponse, estacionesResponse] = await Promise.all([
      apiClient.get<BaseResponseDto<Array<Record<string, unknown>>>>(`/ruta-estaciones/ruta/${rutaId}`),
      apiClient.get<BaseResponseDto<Array<Record<string, unknown>>>>("/estaciones"),
    ]);

    const routeStations = unwrapResponseData(routeStationsResponse).map(normalizeRutaEstacion);
    const estaciones = unwrapResponseData(estacionesResponse).map(normalizeEstacion);
    const estacionesById = new Map(estaciones.map((estacion) => [estacion.id, estacion]));

    return routeStations
      .filter((routeStation) => routeStation.isActive !== false)
      .sort((left, right) => left.orden - right.orden)
      .map((routeStation) => ({
        ...routeStation,
        estacion: estacionesById.get(routeStation.estacionId),
      }))
      .filter((routeStation): routeStation is RouteStation => Boolean(routeStation.estacion));
  },
};
