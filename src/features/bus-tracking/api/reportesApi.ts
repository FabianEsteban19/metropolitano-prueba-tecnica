import axios from "axios";

import type { BaseResponseDto, CreateReporteRequest, Reporte } from "@/api/types";
import { apiClient, unwrapResponseData } from "@/lib/api/httpClient";

function toNumber(value: unknown, fallback: number | null = null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeReporte(raw: Record<string, unknown>): Reporte {
  return {
    id: String(raw.id ?? ""),
    busId: String(raw.busId ?? raw.bus_id ?? ""),
    latitud: toNumber(raw.latitud, 0) ?? 0,
    longitud: toNumber(raw.longitud, 0) ?? 0,
    cantidadPasajeros: toNumber(raw.cantidadPasajeros ?? raw.cantidad_pasajeros, 0) ?? 0,
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    estacionId: raw.estacionId ?? raw.estacion_id ? String(raw.estacionId ?? raw.estacion_id) : null,
    ocupacionPct: toNumber(raw.ocupacionPct ?? raw.ocupacion_pct),
    velocidadKmh: toNumber(raw.velocidadKmh ?? raw.velocidad_kmh),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  };
}

export const trackingReportesApi = {
  async create(payload: CreateReporteRequest) {
    try {
      const response = await apiClient.post<BaseResponseDto<Record<string, unknown>>>("/reportes", payload);
      return normalizeReporte(unwrapResponseData(response));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[trackingReportesApi] POST /reportes failed", {
          payload,
          response: axios.isAxiosError(error) ? error.response?.data : undefined,
          status: axios.isAxiosError(error) ? error.response?.status : undefined,
        });
      }
      throw error;
    }
  },
};
