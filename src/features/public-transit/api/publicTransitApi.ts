import { getApiErrorMessage, publicApiClient } from "@/lib/api/httpClient";

import type {
  PublicBus,
  PublicEstacion,
  PublicReporte,
  PublicRuta,
  PublicRutaEstacion,
} from "../types";

type BaseResponseDto<T> = {
  message: string;
  data: T | null;
};

function unwrapData<T>(response: { data: BaseResponseDto<T> }) {
  return response.data.data;
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "items" in payload) {
    const items = (payload as { items?: unknown }).items;
    return Array.isArray(items) ? (items as T[]) : [];
  }
  return [];
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeRuta(raw: Record<string, unknown>): PublicRuta {
  return {
    id: String(raw.id ?? ""),
    codigo: String(raw.codigo ?? ""),
    nombre: String(raw.nombre ?? ""),
    servicio: String(raw.servicio ?? "Regular"),
    color: String(raw.color ?? "#E30613"),
    frecuenciaMin: toNumber(raw.frecuenciaMin ?? raw.frecuencia_min, 0),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
    descripcion: typeof raw.descripcion === "string" ? raw.descripcion : undefined,
  };
}

function normalizeEstacion(raw: Record<string, unknown>): PublicEstacion {
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

function normalizeRutaEstacion(raw: Record<string, unknown>): PublicRutaEstacion {
  return {
    rutaId: String(raw.rutaId ?? raw.ruta_id ?? ""),
    estacionId: String(raw.estacionId ?? raw.estacion_id ?? ""),
    orden: toNumber(raw.orden),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  };
}

function normalizeBus(raw: Record<string, unknown>): PublicBus {
  return {
    id: String(raw.id ?? ""),
    codigo: String(raw.codigo ?? ""),
    capacidad: toNumber(raw.capacidad),
    placa: raw.placa == null ? null : String(raw.placa),
    rutaId: raw.rutaId ?? raw.ruta_id ? String(raw.rutaId ?? raw.ruta_id) : null,
    estado: String(raw.estado ?? "fuera_servicio") as PublicBus["estado"],
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  };
}

function normalizeReporte(raw: Record<string, unknown>): PublicReporte {
  return {
    id: String(raw.id ?? ""),
    busId: String(raw.busId ?? raw.bus_id ?? ""),
    latitud: toNumber(raw.latitud),
    longitud: toNumber(raw.longitud),
    cantidadPasajeros: toNumber(raw.cantidadPasajeros ?? raw.cantidad_pasajeros),
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    estacionId: raw.estacionId ?? raw.estacion_id ? String(raw.estacionId ?? raw.estacion_id) : null,
    ocupacionPct: raw.ocupacionPct == null && raw.ocupacion_pct == null ? null : toNumber(raw.ocupacionPct ?? raw.ocupacion_pct),
    velocidadKmh: raw.velocidadKmh == null && raw.velocidad_kmh == null ? null : toNumber(raw.velocidadKmh ?? raw.velocidad_kmh),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  };
}

export async function listPublicRutas() {
  const response = await publicApiClient.get<BaseResponseDto<unknown>>("/rutas");
  return unwrapList<Record<string, unknown>>(unwrapData(response)).map(normalizeRuta).filter((ruta) => ruta.isActive !== false);
}

export async function listPublicEstaciones() {
  const response = await publicApiClient.get<BaseResponseDto<unknown>>("/estaciones");
  return unwrapList<Record<string, unknown>>(unwrapData(response))
    .map(normalizeEstacion)
    .filter((estacion) => estacion.isActive !== false)
    .sort((left, right) => left.orden - right.orden);
}

export async function listPublicBuses() {
  const response = await publicApiClient.get<BaseResponseDto<unknown>>("/buses");
  return unwrapList<Record<string, unknown>>(unwrapData(response)).map(normalizeBus).filter((bus) => bus.isActive !== false);
}

export async function listPublicRutaEstacionesByRuta(rutaId: string) {
  const response = await publicApiClient.get<BaseResponseDto<unknown>>(`/ruta-estaciones/ruta/${rutaId}`);
  return unwrapList<Record<string, unknown>>(unwrapData(response))
    .map(normalizeRutaEstacion)
    .filter((row) => row.isActive !== false)
    .sort((left, right) => left.orden - right.orden);
}

export async function listPublicReportes() {
  try {
    const response = await publicApiClient.get<BaseResponseDto<unknown>>("/reportes");
    return unwrapList<Record<string, unknown>>(unwrapData(response))
      .map(normalizeReporte)
      .filter((reporte) => reporte.isActive !== false);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[publicTransitApi] reportes no disponibles para landing", getApiErrorMessage(error));
    }
    return [];
  }
}
