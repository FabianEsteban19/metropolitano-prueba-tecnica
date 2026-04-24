import type { BaseResponseDto, Bus, Ruta } from "@/api/types";
import { apiClient, unwrapResponseData } from "@/lib/api/httpClient";

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

function normalizeBus(raw: Record<string, unknown>): Bus {
  return {
    id: String(raw.id ?? ""),
    codigo: String(raw.codigo ?? ""),
    capacidad: toNumber(raw.capacidad, 0),
    placa: raw.placa == null ? null : String(raw.placa),
    rutaId: raw.rutaId ?? raw.ruta_id ? String(raw.rutaId ?? raw.ruta_id) : null,
    estado: String(raw.estado ?? "fuera_servicio") as Bus["estado"],
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  };
}

function normalizeRuta(raw: Record<string, unknown>): Ruta {
  return {
    id: String(raw.id ?? ""),
    codigo: String(raw.codigo ?? ""),
    nombre: String(raw.nombre ?? ""),
    servicio: String(raw.servicio ?? "Regular") as Ruta["servicio"],
    color: String(raw.color ?? "#E30613"),
    frecuenciaMin: toNumber(raw.frecuenciaMin ?? raw.frecuencia_min, 0),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  };
}

export const trackingReferenceApi = {
  async listBuses() {
    const response = await apiClient.get<BaseResponseDto<unknown>>("/buses");
    return unwrapList<Record<string, unknown>>(unwrapResponseData(response))
      .map(normalizeBus)
      .filter((bus) => bus.isActive !== false)
      .sort((left, right) => left.codigo.localeCompare(right.codigo, "es"));
  },

  async listRutas() {
    const response = await apiClient.get<BaseResponseDto<unknown>>("/rutas");
    return unwrapList<Record<string, unknown>>(unwrapResponseData(response))
      .map(normalizeRuta)
      .filter((ruta) => ruta.isActive !== false)
      .sort((left, right) => left.nombre.localeCompare(right.nombre, "es"));
  },
};
