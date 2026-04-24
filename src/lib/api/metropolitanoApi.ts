// ============================================================
// Capa de servicio del Metropolitano — MVP de gestión interna
// Espejo de los endpoints de tu backend NestJS.
// ------------------------------------------------------------
//
//   ENDPOINTS REST esperados
//   ─────────────────────────────────────────────────────
//   AUTH
//   POST   /auth/login                  → { access_token, user }
//
//   BUSES
//   POST   /buses                       (CreateBusDto)
//   GET    /buses?page=&page_size=&estado=&ruta_id=&search=&filtro=
//   GET    /buses/:id
//   PATCH  /buses/:id                   (UpdateBusDto)
//   DELETE /buses/:id
//   GET    /buses/estado-actual         → último estado por bus (vista)
//   GET    /buses/:id/historial?limit=&desde=&hasta=
//
//   REPORTES
//   POST   /buses/:id/reportes          (CreateReporteDto)
//   GET    /reportes?page=&page_size=&bus_id=
//
//   RUTAS / ESTACIONES
//   GET    /rutas             POST /rutas       PATCH /rutas/:id    DELETE /rutas/:id
//   GET    /estaciones        POST /estaciones  PATCH /estaciones/:id  DELETE /estaciones/:id
//   GET    /horarios/:rutaId/:estacionId
//
//   LIVE
//   WS     /live/buses
//
//   Configuración:
//     VITE_METROPOLITANO_API_URL   (ej. http://localhost:3000)
//     VITE_METROPOLITANO_WS_URL    (opcional)
//
//   Sin esas variables, opera contra un store en memoria con
//   persistencia en localStorage (modo MVP / demo).
// ============================================================

import type {
  ApiResponse,
  Bus,
  BusLiveView,
  CreateBusDto,
  CreateEstacionDto,
  CreateReporteDto,
  CreateRutaDto,
  Estacion,
  LiveUpdate,
  Paginated,
  Reporte,
  Ruta,
  ScheduleEntry,
  UpdateBusDto,
  UpdateEstacionDto,
  UpdateRutaDto,
} from "./types";
import { ESTACIONES, RUTAS, generateSchedule, seedBuses, seedReportes } from "./mockData";
import { getAccessToken, handleUnauthorizedSession } from "@/lib/auth/storage";

const API_URL = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_METROPOLITANO_API_URL) as string | undefined;
const WS_URL = import.meta.env.VITE_METROPOLITANO_WS_URL as string | undefined;
const USE_MOCK = !API_URL;

// ============================================================
// Store local (modo mock) — persistencia en localStorage
// ============================================================
const STORE_KEY = "metropolitano_store_v2";

interface Store {
  buses: Bus[];
  reportes: Reporte[];
  rutas: Ruta[];
  estaciones: Estacion[];
  next_bus_id: number;
  next_reporte_id: number;
  next_ruta_id: number;
  next_estacion_id: number;
}

function initialStore(): Store {
  const buses = seedBuses();
  const reportes = seedReportes();
  return {
    buses,
    reportes,
    rutas: [...RUTAS],
    estaciones: [...ESTACIONES],
    next_bus_id: Math.max(0, ...buses.map((b) => b.id)) + 1,
    next_reporte_id: Math.max(0, ...reportes.map((r) => r.id)) + 1,
    next_ruta_id: Math.max(0, ...RUTAS.map((r) => r.id)) + 1,
    next_estacion_id: Math.max(0, ...ESTACIONES.map((e) => e.id)) + 1,
  };
}

function loadStore(): Store {
  if (typeof window === "undefined") return initialStore();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      const init = initialStore();
      localStorage.setItem(STORE_KEY, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw) as Store;
  } catch {
    return initialStore();
  }
}

function saveStore(s: Store) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  }
}

let store: Store = loadStore();

/** Limpia el store y re-siembra (útil para testing / reset). */
export function resetStore() {
  store = initialStore();
  saveStore(store);
  notify();
}

// ============================================================
// Helpers
// ============================================================
function nearestEstacion(lat: number, lng: number): Estacion {
  let best = store.estaciones[0];
  let bestD = Infinity;
  for (const s of store.estaciones) {
    const d = (s.latitud - lat) ** 2 + (s.longitud - lng) ** 2;
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function attachUltimoReporte(bus: Bus): Bus {
  const reports = store.reportes
    .filter((r) => r.bus_id === bus.id)
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  return { ...bus, ultimo_reporte: reports[0] ?? null };
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toNumber(value: unknown, fallback = 0): number {
  return parseNumeric(value) ?? fallback;
}

function toIdentifier<T>(value: unknown, fallback: T): T {
  if (typeof value === "number" && Number.isFinite(value)) return value as T;
  if (typeof value === "string" && value.trim() !== "") return value as T;
  return fallback;
}

function toOptionalNumber(value: unknown): number | null {
  return value == null || value === "" ? null : parseNumeric(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function unwrapApiPayload<T>(body: unknown): T {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

async function parseHttpBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

type RutaApiModel = Partial<Omit<Ruta, "frecuencia_min" | "estacion_ids">> & {
  id?: Ruta["id"] | string;
  frecuenciaMin?: number | string | null;
  frecuencia_min?: number | string | null;
  estacionIds?: Array<number | string> | null;
  estacion_ids?: Array<number | string> | null;
};

type EstacionApiModel = Partial<Estacion> & {
  id?: Estacion["id"] | string;
};

type ReporteApiModel = Partial<Omit<Reporte, "bus_id" | "estacion_id" | "cantidad_pasajeros" | "ocupacion_pct" | "velocidad_kmh">> & {
  id?: Reporte["id"] | string;
  busId?: Bus["id"] | string;
  bus_id?: Bus["id"] | string;
  cantidadPasajeros?: number | string | null;
  cantidad_pasajeros?: number | string | null;
  estacionId?: Estacion["id"] | string | null;
  estacion_id?: Estacion["id"] | string | null;
  ocupacionPct?: number | string | null;
  ocupacion_pct?: number | string | null;
  velocidadKmh?: number | string | null;
  velocidad_kmh?: number | string | null;
};

type BusApiModel = Partial<Omit<Bus, "ruta_id" | "created_at" | "ultimo_reporte">> & {
  id?: Bus["id"] | string;
  rutaId?: Ruta["id"] | string | null;
  ruta_id?: Ruta["id"] | string | null;
  createdAt?: string;
  created_at?: string;
  ultimoReporte?: ReporteApiModel | null;
  ultimo_reporte?: ReporteApiModel | null;
};

function isPaginatedShape<T>(value: unknown): value is Paginated<T> {
  return Boolean(
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as { items?: unknown }).items),
  );
}

function toPaginated<T>(
  value: unknown,
  page: number,
  page_size: number,
): Paginated<T> {
  if (isPaginatedShape<T>(value)) {
    const safeTotal = typeof value.total === "number" ? value.total : value.items.length;
    return {
      items: value.items,
      total: safeTotal,
      page: typeof value.page === "number" ? value.page : page,
      page_size: typeof value.page_size === "number" ? value.page_size : page_size,
    };
  }

  if (Array.isArray(value)) {
    const total = value.length;
    const start = (page - 1) * page_size;
    return {
      items: value.slice(start, start + page_size) as T[],
      total,
      page,
      page_size,
    };
  }

  return {
    items: [],
    total: 0,
    page,
    page_size,
  };
}

function normalizeRuta(raw: RutaApiModel): Ruta {
  const estacionesRaw = Array.isArray(raw.estacion_ids)
    ? raw.estacion_ids
    : Array.isArray(raw.estacionIds)
      ? raw.estacionIds
      : undefined;

  return {
    id: toIdentifier(raw.id, "" as unknown as Ruta["id"]),
    codigo: String(raw.codigo ?? ""),
    nombre: String(raw.nombre ?? ""),
    servicio: (raw.servicio ?? "Regular") as Ruta["servicio"],
    color: String(raw.color ?? "#E30613"),
    frecuencia_min: toNumber(raw.frecuencia_min ?? raw.frecuenciaMin ?? 5, 5),
    estacion_ids: estacionesRaw
      ?.map((id) => toIdentifier(id, "" as unknown as Ruta["id"]))
      .filter((id) => String(id).trim() !== ""),
    descripcion: raw.descripcion,
    horarios: raw.horarios,
  };
}

function normalizeEstacion(raw: EstacionApiModel): Estacion {
  return {
    id: toIdentifier(raw.id, "" as unknown as Estacion["id"]),
    nombre: String(raw.nombre ?? ""),
    distrito: String(raw.distrito ?? ""),
    latitud: toNumber(raw.latitud, 0),
    longitud: toNumber(raw.longitud, 0),
    orden: toNumber(raw.orden, 0),
  };
}

function normalizeReporte(raw: ReporteApiModel): Reporte {
  return {
    id: toIdentifier(raw.id, "" as unknown as Reporte["id"]),
    bus_id: toIdentifier(raw.bus_id ?? raw.busId, "" as unknown as Reporte["bus_id"]),
    latitud: toNumber(raw.latitud, 0),
    longitud: toNumber(raw.longitud, 0),
    cantidad_pasajeros: toNumber(raw.cantidad_pasajeros ?? raw.cantidadPasajeros, 0),
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    estacion_id: raw.estacion_id == null && raw.estacionId == null
      ? null
      : toIdentifier(raw.estacion_id ?? raw.estacionId, null as unknown as Reporte["estacion_id"]),
    ocupacion_pct: toOptionalNumber(raw.ocupacion_pct ?? raw.ocupacionPct),
    velocidad_kmh: toOptionalNumber(raw.velocidad_kmh ?? raw.velocidadKmh),
  };
}

function normalizeBus(raw: BusApiModel): Bus {
  const ultimoReporteRaw = raw.ultimo_reporte ?? raw.ultimoReporte;

  return {
    id: toIdentifier(raw.id, "" as unknown as Bus["id"]),
    codigo: String(raw.codigo ?? ""),
    capacidad: toNumber(raw.capacidad, 0),
    placa: raw.placa == null ? null : String(raw.placa),
    ruta_id: raw.ruta_id == null && raw.rutaId == null
      ? null
      : toIdentifier(raw.ruta_id ?? raw.rutaId, null as unknown as Bus["ruta_id"]),
    estado: (raw.estado ?? "fuera_servicio") as Bus["estado"],
    created_at: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
    ultimo_reporte: isRecord(ultimoReporteRaw)
      ? normalizeReporte(ultimoReporteRaw as ReporteApiModel)
      : null,
  };
}

function serializeRutaDto(dto: CreateRutaDto | UpdateRutaDto) {
  const payload: Record<string, unknown> = {
    ...dto,
  };

  if ("frecuencia_min" in dto) {
    payload.frecuenciaMin = dto.frecuencia_min;
    delete payload.frecuencia_min;
  }

  if ("frecuenciaMin" in dto) {
    payload.frecuenciaMin = dto.frecuenciaMin;
  }

  return payload;
}

function serializeBusDto(dto: CreateBusDto | UpdateBusDto) {
  const payload: Record<string, unknown> = {
    ...dto,
  };

  if ("ruta_id" in dto) {
    payload.rutaId = dto.ruta_id ?? null;
    delete payload.ruta_id;
  }

  return payload;
}

function serializeReporteDto(dto: CreateReporteDto) {
  return {
    busId: dto.bus_id,
    latitud: dto.latitud,
    longitud: dto.longitud,
    cantidadPasajeros: dto.cantidad_pasajeros,
    estacionId: dto.estacion_id ?? null,
    velocidadKmh: dto.velocidad_kmh ?? null,
  };
}

async function http<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const token = getAccessToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    const json = await parseHttpBody(res);
    if (!res.ok) {
      if (res.status === 401 && token) {
        handleUnauthorizedSession();
      }
      const message = Array.isArray((json as { message?: unknown }).message)
        ? ((json as { message: unknown[] }).message.map(String).join(", "))
        : ((json as { message?: string }).message ?? res.statusText);
      const error = (json && typeof json === "object" && "error" in json)
        ? (json as { error?: ApiResponse<T>["error"] }).error
        : undefined;
      return { ok: false, error: error ?? { code: "HTTP_ERROR", message } };
    }
    return { ok: true, data: unwrapApiPayload<T>(json) };
  } catch (e: unknown) {
    return { ok: false, error: { code: "NETWORK", message: e instanceof Error ? e.message : "network error" } };
  }
}

// ============================================================
// Endpoints — Buses
// ============================================================

export type BusFilter = "todos" | "lleno" | "medio" | "bajo" | "sin_reporte" | "fuera_servicio";

export interface ListarBusesParams {
  page?: number;
  page_size?: number;
  search?: string;
  ruta_id?: number | null;
  estado?: string | null;
  filtro?: BusFilter;
}

/** GET /buses */
export async function listarBuses(params: ListarBusesParams = {}): Promise<ApiResponse<Paginated<Bus>>> {
  if (USE_MOCK) {
    let list = store.buses.map(attachUltimoReporte);

    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter((b) =>
        b.codigo.toLowerCase().includes(q) ||
        (b.placa ?? "").toLowerCase().includes(q),
      );
    }
    if (params.ruta_id != null) list = list.filter((b) => String(b.ruta_id) === String(params.ruta_id));
    if (params.estado) list = list.filter((b) => b.estado === params.estado);

    if (params.filtro && params.filtro !== "todos") {
      list = list.filter((b) => {
        const pct = b.ultimo_reporte?.ocupacion_pct ?? -1;
        if (params.filtro === "sin_reporte") return !b.ultimo_reporte;
        if (params.filtro === "fuera_servicio") return b.estado === "fuera_servicio";
        if (params.filtro === "lleno") return pct >= 85;
        if (params.filtro === "medio") return pct >= 60 && pct < 85;
        if (params.filtro === "bajo") return pct >= 0 && pct < 60;
        return true;
      });
    }

    const total = list.length;
    const page = params.page ?? 1;
    const page_size = params.page_size ?? 10;
    const items = list.slice((page - 1) * page_size, page * page_size);
    return { ok: true, data: { items, total, page, page_size } };
  }

  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
  const r = await http<Paginated<BusApiModel> | BusApiModel[]>(`/buses?${qs.toString()}`);
  if (!r.ok) return r as ApiResponse<Paginated<Bus>>;

  const page = params.page ?? 1;
  const page_size = params.page_size ?? 10;
  const paginated = toPaginated<BusApiModel>(r.data, page, page_size);
  return {
    ok: true,
    data: {
      ...paginated,
      items: paginated.items.map(normalizeBus),
    },
  };
}

/** GET /buses/:id */
export async function obtenerBus(id: number): Promise<ApiResponse<Bus>> {
  if (USE_MOCK) {
    const bus = store.buses.find((b) => b.id === id);
    if (!bus) return { ok: false, error: { code: "NOT_FOUND", message: "Bus no encontrado" } };
    return { ok: true, data: attachUltimoReporte(bus) };
  }
  const r = await http<BusApiModel>(`/buses/${id}`);
  return r.ok && r.data
    ? { ok: true, data: normalizeBus(r.data) }
    : { ok: false, error: r.error ?? { code: "NOT_FOUND", message: "Bus no encontrado" } };
}

/** POST /buses */
export async function crearBus(input: CreateBusDto): Promise<ApiResponse<Bus>> {
  if (!input.codigo?.trim()) return { ok: false, error: { code: "VALIDATION", field: "codigo", message: "El código es obligatorio" } };
  if (!Number.isFinite(input.capacidad) || input.capacidad <= 0)
    return { ok: false, error: { code: "VALIDATION", field: "capacidad", message: "La capacidad debe ser > 0" } };
  if (input.capacidad > 300)
    return { ok: false, error: { code: "VALIDATION", field: "capacidad", message: "Capacidad máxima 300" } };

  if (USE_MOCK) {
    if (store.buses.some((b) => b.codigo.toLowerCase() === input.codigo.toLowerCase()))
      return { ok: false, error: { code: "DUPLICATE", field: "codigo", message: "Ya existe un bus con ese código" } };
    if (input.placa && store.buses.some((b) => b.placa?.toLowerCase() === input.placa!.toLowerCase()))
      return { ok: false, error: { code: "DUPLICATE", field: "placa", message: "Placa ya registrada" } };
    if (input.ruta_id && !store.rutas.find((r) => String(r.id) === String(input.ruta_id)))
      return { ok: false, error: { code: "VALIDATION", field: "ruta_id", message: "Ruta inválida" } };

    const bus: Bus = {
      id: store.next_bus_id++,
      codigo: input.codigo.trim().toUpperCase(),
      capacidad: input.capacidad,
      placa: input.placa?.trim().toUpperCase() ?? null,
      ruta_id: input.ruta_id ?? null,
      estado: input.estado ?? "fuera_servicio",
      created_at: new Date().toISOString(),
      ultimo_reporte: null,
    };
    store.buses.push(bus);
    saveStore(store);
    notify();
    return { ok: true, data: bus };
  }
  const r = await http<BusApiModel>("/buses", { method: "POST", body: JSON.stringify(serializeBusDto(input)) });
  return r.ok && r.data
    ? { ok: true, data: normalizeBus(r.data) }
    : { ok: false, error: r.error ?? { code: "HTTP_ERROR", message: "No se pudo crear el bus" } };
}

/** PATCH /buses/:id */
export async function actualizarBus(id: number, patch: UpdateBusDto): Promise<ApiResponse<Bus>> {
  if (USE_MOCK) {
    const idx = store.buses.findIndex((b) => b.id === id);
    if (idx < 0) return { ok: false, error: { code: "NOT_FOUND", message: "Bus no encontrado" } };
    if (patch.capacidad !== undefined && patch.capacidad <= 0)
      return { ok: false, error: { code: "VALIDATION", field: "capacidad", message: "Capacidad inválida" } };
    if (patch.codigo && store.buses.some((b) => b.id !== id && b.codigo.toLowerCase() === patch.codigo!.toLowerCase()))
      return { ok: false, error: { code: "DUPLICATE", field: "codigo", message: "Código duplicado" } };

    if (patch.ruta_id != null && !store.rutas.find((r) => String(r.id) === String(patch.ruta_id)))
      return { ok: false, error: { code: "VALIDATION", field: "ruta_id", message: "Ruta invÃ¡lida" } };

    store.buses[idx] = {
      ...store.buses[idx],
      ...patch,
      placa: patch.placa !== undefined ? (patch.placa?.trim().toUpperCase() ?? null) : store.buses[idx].placa,
      codigo: patch.codigo ? patch.codigo.trim().toUpperCase() : store.buses[idx].codigo,
    };
    saveStore(store);
    notify();
    return { ok: true, data: attachUltimoReporte(store.buses[idx]) };
  }
  const r = await http<BusApiModel>(`/buses/${id}`, { method: "PATCH", body: JSON.stringify(serializeBusDto(patch)) });
  return r.ok && r.data
    ? { ok: true, data: normalizeBus(r.data) }
    : { ok: false, error: r.error ?? { code: "HTTP_ERROR", message: "No se pudo actualizar el bus" } };
}

/** DELETE /buses/:id */
export async function eliminarBus(id: number): Promise<ApiResponse<{ id: number }>> {
  if (USE_MOCK) {
    const exists = store.buses.find((b) => b.id === id);
    if (!exists) return { ok: false, error: { code: "NOT_FOUND", message: "Bus no encontrado" } };
    store.buses = store.buses.filter((b) => b.id !== id);
    store.reportes = store.reportes.filter((r) => r.bus_id !== id);
    saveStore(store);
    notify();
    return { ok: true, data: { id } };
  }
  return http(`/buses/${id}`, { method: "DELETE" });
}

/** PATCH /buses/:id/estado — atajo para deshabilitar / cambiar estado */
export async function cambiarEstadoBus(id: number, estado: Bus["estado"]): Promise<ApiResponse<Bus>> {
  return actualizarBus(id, { estado });
}

/** GET /buses/estado-actual — vista último estado por bus */
export async function obtenerEstadoActual(): Promise<ApiResponse<Bus[]>> {
  if (USE_MOCK) return { ok: true, data: store.buses.map(attachUltimoReporte) };
  const r = await http<BusApiModel[]>("/buses/estado-actual");
  return r.ok
    ? { ok: true, data: (r.data ?? []).map(normalizeBus) }
    : { ok: false, error: r.error ?? { code: "HTTP_ERROR", message: "No se pudo obtener el estado actual" } };
}

// ============================================================
// Endpoints — Reportes
// ============================================================

/** POST /reportes */
export async function registrarReporte(input: CreateReporteDto): Promise<ApiResponse<Reporte>> {
  if (typeof input.latitud !== "number" || input.latitud < -90 || input.latitud > 90)
    return { ok: false, error: { code: "VALIDATION", field: "latitud", message: "Latitud fuera de rango (-90, 90)" } };
  if (typeof input.longitud !== "number" || input.longitud < -180 || input.longitud > 180)
    return { ok: false, error: { code: "VALIDATION", field: "longitud", message: "Longitud fuera de rango (-180, 180)" } };
  if (!Number.isInteger(input.cantidad_pasajeros) || input.cantidad_pasajeros < 0)
    return { ok: false, error: { code: "VALIDATION", field: "cantidad_pasajeros", message: "Pasajeros debe ser entero ≥ 0" } };

  if (USE_MOCK) {
    const bus = store.buses.find((b) => b.id === input.bus_id);
    if (!bus) return { ok: false, error: { code: "NOT_FOUND", message: "Bus no encontrado" } };
    if (input.cantidad_pasajeros > bus.capacidad)
      return {
        ok: false,
        error: {
          code: "CAPACITY_EXCEEDED",
          field: "cantidad_pasajeros",
          message: `Pasajeros (${input.cantidad_pasajeros}) excede la capacidad del bus (${bus.capacidad}).`,
        },
      };
    const estacion = input.estacion_id
      ? store.estaciones.find((s) => s.id === input.estacion_id) ?? nearestEstacion(input.latitud, input.longitud)
      : nearestEstacion(input.latitud, input.longitud);
    const rep: Reporte = {
      id: store.next_reporte_id++,
      bus_id: input.bus_id,
      latitud: input.latitud,
      longitud: input.longitud,
      cantidad_pasajeros: input.cantidad_pasajeros,
      timestamp: new Date().toISOString(),
      estacion_id: estacion.id,
      ocupacion_pct: Math.round((input.cantidad_pasajeros / bus.capacidad) * 100),
      velocidad_kmh: input.velocidad_kmh ?? null,
    };
    store.reportes.push(rep);
    saveStore(store);
    notify();
    return { ok: true, data: rep };
  }
  const r = await http<ReporteApiModel>("/reportes", { method: "POST", body: JSON.stringify(serializeReporteDto(input)) });
  return r.ok && r.data
    ? { ok: true, data: normalizeReporte(r.data) }
    : { ok: false, error: r.error ?? { code: "HTTP_ERROR", message: "No se pudo registrar el reporte" } };
}

/** GET /buses/:id/historial?limit=&desde=&hasta= */
export async function obtenerHistorial(
  busId: number,
  opts: { limit?: number; desde?: string; hasta?: string } = {},
): Promise<ApiResponse<Reporte[]>> {
  if (USE_MOCK) {
    let list = store.reportes
      .filter((r) => r.bus_id === busId)
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
    if (opts.desde) list = list.filter((r) => r.timestamp >= opts.desde!);
    if (opts.hasta) list = list.filter((r) => r.timestamp <= opts.hasta!);
    if (opts.limit) list = list.slice(0, opts.limit);
    return { ok: true, data: list };
  }
  const qs = new URLSearchParams();
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.desde) qs.set("desde", opts.desde);
  if (opts.hasta) qs.set("hasta", opts.hasta);
  const r = await http<Paginated<ReporteApiModel> | ReporteApiModel[]>(`/reportes?${qs.toString()}`);
  if (!r.ok) {
    return { ok: false, error: r.error ?? { code: "HTTP_ERROR", message: "No se pudo obtener el historial" } };
  }

  const page_size = opts.limit ? Math.max(opts.limit, 1000) : 1000;
  let list = toPaginated<ReporteApiModel>(r.data, 1, page_size).items
    .map(normalizeReporte)
    .filter((item) => String(item.bus_id) === String(busId))
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  if (opts.desde) list = list.filter((item) => item.timestamp >= opts.desde!);
  if (opts.hasta) list = list.filter((item) => item.timestamp <= opts.hasta!);
  if (opts.limit) list = list.slice(0, opts.limit);

  return { ok: true, data: list };
}

/** GET /reportes — listado global con paginación */
export async function listarReportes(params: { page?: number; page_size?: number; bus_id?: number | null } = {}): Promise<ApiResponse<Paginated<Reporte>>> {
  if (USE_MOCK) {
    let list = [...store.reportes];
    if (params.bus_id) list = list.filter((r) => r.bus_id === params.bus_id);
    list.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
    const total = list.length;
    const page = params.page ?? 1;
    const page_size = params.page_size ?? 20;
    const items = list.slice((page - 1) * page_size, page * page_size);
    return { ok: true, data: { items, total, page, page_size } };
  }
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
  const r = await http<Paginated<ReporteApiModel> | ReporteApiModel[]>(`/reportes?${qs.toString()}`);
  if (!r.ok) return r as ApiResponse<Paginated<Reporte>>;

  const page = params.page ?? 1;
  const page_size = params.page_size ?? 20;
  const paginated = toPaginated<ReporteApiModel>(r.data, page, page_size);
  return {
    ok: true,
    data: {
      ...paginated,
      items: paginated.items.map(normalizeReporte),
    },
  };
}

// ============================================================
// Endpoints — Rutas
// ============================================================
export async function listarRutas(): Promise<Ruta[]> {
  if (USE_MOCK) return [...store.rutas];
  const r = await http<RutaApiModel[]>("/rutas");
  return (r.data ?? []).map(normalizeRuta);
}

export async function obtenerRuta(id: number): Promise<ApiResponse<Ruta>> {
  if (USE_MOCK) {
    const r = store.rutas.find((x) => x.id === id);
    return r ? { ok: true, data: r } : { ok: false, error: { code: "NOT_FOUND", message: "Ruta no encontrada" } };
  }
  const rutas = await listarRutas();
  const ruta = rutas.find((item) => item.id === id);
  return ruta
    ? { ok: true, data: ruta }
    : { ok: false, error: { code: "NOT_FOUND", message: "Ruta no encontrada" } };
}

export async function obtenerRutaPorCodigo(codigo: string): Promise<ApiResponse<Ruta>> {
  if (USE_MOCK) {
    const ruta = store.rutas.find((item) => item.codigo.toLowerCase() === codigo.toLowerCase());
    return ruta
      ? { ok: true, data: ruta }
      : { ok: false, error: { code: "NOT_FOUND", message: "Ruta no encontrada" } };
  }

  const r = await http<RutaApiModel>(`/rutas/codigo/${encodeURIComponent(codigo)}`);
  return r.ok && r.data
    ? { ok: true, data: normalizeRuta(r.data) }
    : { ok: false, error: r.error ?? { code: "NOT_FOUND", message: "Ruta no encontrada" } };
}

export async function crearRuta(dto: CreateRutaDto): Promise<ApiResponse<Ruta>> {
  const frecuencia = dto.frecuenciaMin ?? dto.frecuencia_min ?? 5;

  if (!dto.codigo?.trim()) return { ok: false, error: { code: "VALIDATION", field: "codigo", message: "Código requerido" } };
  if (!dto.nombre?.trim()) return { ok: false, error: { code: "VALIDATION", field: "nombre", message: "Nombre requerido" } };
  if (USE_MOCK) {
    if (store.rutas.some((r) => r.codigo.toLowerCase() === dto.codigo.toLowerCase()))
      return { ok: false, error: { code: "DUPLICATE", field: "codigo", message: "Código de ruta duplicado" } };
    const ruta: Ruta = {
      id: store.next_ruta_id++,
      codigo: dto.codigo.trim().toUpperCase(),
      nombre: dto.nombre.trim(),
      servicio: dto.servicio,
      color: dto.color,
      frecuencia_min: frecuencia,
      estacion_ids: [],
    };
    store.rutas.push(ruta);
    saveStore(store);
    notify();
    return { ok: true, data: ruta };
  }
  const r = await http<RutaApiModel>("/rutas", { method: "POST", body: JSON.stringify(serializeRutaDto(dto)) });
  return r.ok && r.data
    ? { ok: true, data: normalizeRuta(r.data) }
    : { ok: false, error: r.error ?? { code: "HTTP_ERROR", message: "No se pudo crear la ruta" } };
}

export async function actualizarRuta(id: number, patch: UpdateRutaDto): Promise<ApiResponse<Ruta>> {
  const frecuencia = patch.frecuenciaMin ?? patch.frecuencia_min;

  if (USE_MOCK) {
    const idx = store.rutas.findIndex((r) => r.id === id);
    if (idx < 0) return { ok: false, error: { code: "NOT_FOUND", message: "Ruta no encontrada" } };
    if (frecuencia !== undefined && frecuencia < 1)
      return { ok: false, error: { code: "VALIDATION", field: "frecuenciaMin", message: "Frecuencia invalida" } };
    store.rutas[idx] = {
      ...store.rutas[idx],
      ...patch,
      codigo: patch.codigo ? patch.codigo.trim().toUpperCase() : store.rutas[idx].codigo,
      nombre: patch.nombre ? patch.nombre.trim() : store.rutas[idx].nombre,
      frecuencia_min: frecuencia ?? store.rutas[idx].frecuencia_min,
    };
    saveStore(store);
    notify();
    return { ok: true, data: store.rutas[idx] };
  }
  const r = await http<RutaApiModel>(`/rutas/${id}`, { method: "PATCH", body: JSON.stringify(serializeRutaDto(patch)) });
  return r.ok && r.data
    ? { ok: true, data: normalizeRuta(r.data) }
    : { ok: false, error: r.error ?? { code: "HTTP_ERROR", message: "No se pudo actualizar la ruta" } };
}

export async function eliminarRuta(id: number): Promise<ApiResponse<{ id: number }>> {
  if (USE_MOCK) {
    if (store.buses.some((b) => b.ruta_id === id))
      return { ok: false, error: { code: "CONFLICT", message: "No se puede eliminar: hay buses asignados a esta ruta" } };
    store.rutas = store.rutas.filter((r) => r.id !== id);
    saveStore(store);
    notify();
    return { ok: true, data: { id } };
  }
  const r = await http<unknown>(`/rutas/${id}`, { method: "DELETE" });
  return r.ok
    ? { ok: true, data: { id } }
    : { ok: false, error: r.error ?? { code: "HTTP_ERROR", message: "No se pudo eliminar la ruta" } };
}

// ============================================================
// Endpoints — Estaciones
// ============================================================
export async function listarEstaciones(): Promise<Estacion[]> {
  if (USE_MOCK) return [...store.estaciones].sort((a, b) => a.orden - b.orden);
  const r = await http<EstacionApiModel[]>("/estaciones");
  return (r.data ?? []).map(normalizeEstacion).sort((a, b) => a.orden - b.orden);
}

export async function crearEstacion(dto: CreateEstacionDto): Promise<ApiResponse<Estacion>> {
  if (!dto.nombre?.trim()) return { ok: false, error: { code: "VALIDATION", field: "nombre", message: "Nombre requerido" } };
  if (USE_MOCK) {
    const est: Estacion = { id: store.next_estacion_id++, ...dto };
    store.estaciones.push(est);
    saveStore(store);
    notify();
    return { ok: true, data: est };
  }
  const r = await http<EstacionApiModel>("/estaciones", { method: "POST", body: JSON.stringify(dto) });
  return r.ok && r.data
    ? { ok: true, data: normalizeEstacion(r.data) }
    : { ok: false, error: r.error ?? { code: "HTTP_ERROR", message: "No se pudo crear la estación" } };
}

export async function actualizarEstacion(id: number, patch: UpdateEstacionDto): Promise<ApiResponse<Estacion>> {
  if (USE_MOCK) {
    const idx = store.estaciones.findIndex((e) => e.id === id);
    if (idx < 0) return { ok: false, error: { code: "NOT_FOUND", message: "Estación no encontrada" } };
    store.estaciones[idx] = { ...store.estaciones[idx], ...patch };
    saveStore(store);
    notify();
    return { ok: true, data: store.estaciones[idx] };
  }
  const r = await http<EstacionApiModel>(`/estaciones/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  return r.ok && r.data
    ? { ok: true, data: normalizeEstacion(r.data) }
    : { ok: false, error: r.error ?? { code: "HTTP_ERROR", message: "No se pudo actualizar la estación" } };
}

export async function eliminarEstacion(id: number): Promise<ApiResponse<{ id: number }>> {
  if (USE_MOCK) {
    store.estaciones = store.estaciones.filter((e) => e.id !== id);
    saveStore(store);
    notify();
    return { ok: true, data: { id } };
  }
  return http(`/estaciones/${id}`, { method: "DELETE" });
}

export async function obtenerHorario(rutaId: number, estacionId: number): Promise<ScheduleEntry> {
  if (USE_MOCK) return generateSchedule(rutaId, estacionId);
  const r = await http<ScheduleEntry>(`/horarios/${rutaId}/${estacionId}`);
  return r.data ?? { ruta_id: rutaId, estacion_id: estacionId, llegadas: [] };
}

// ============================================================
// Simulación automática (extra del enunciado)
// ============================================================
let simInterval: ReturnType<typeof setInterval> | null = null;
const simListeners = new Set<() => void>();

export function isSimulating(): boolean { return simInterval !== null; }

function notify() {
  simListeners.forEach((fn) => fn());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("metropolitano:store-updated"));
  }
}

export function onStoreChange(fn: () => void): () => void {
  simListeners.add(fn);
  return () => { simListeners.delete(fn); };
}

export function startSimulation(intervalMs = 3000) {
  if (simInterval) return;
  const tick = () => {
    store.buses.forEach((bus) => {
      if (bus.estado === "fuera_servicio") return;
      const ruta = store.rutas.find((r) => r.id === bus.ruta_id);
      const ids = ruta?.estacion_ids ?? [];
      const stations = ids.map((id) => store.estaciones.find((s) => s.id === id)!).filter(Boolean);
      if (!stations.length) return;
      const last = store.reportes
        .filter((r) => r.bus_id === bus.id)
        .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];
      let curIdx = 0;
      if (last?.estacion_id) {
        const i = stations.findIndex((s) => s.id === last.estacion_id);
        if (i >= 0) curIdx = i;
      }
      const advance = Math.random() < 0.45;
      const nextIdx = advance ? (curIdx + 1) % stations.length : curIdx;
      const target = stations[nextIdx];
      const lat = target.latitud + (Math.random() - 0.5) * 0.0015;
      const lng = target.longitud + (Math.random() - 0.5) * 0.0015;
      const base = last?.cantidad_pasajeros ?? Math.floor(bus.capacidad * 0.4);
      const delta = Math.floor((Math.random() - 0.45) * 25);
      const pas = Math.max(0, Math.min(bus.capacidad, base + delta));
      store.reportes.push({
        id: store.next_reporte_id++,
        bus_id: bus.id,
        latitud: lat,
        longitud: lng,
        cantidad_pasajeros: pas,
        timestamp: new Date().toISOString(),
        estacion_id: target.id,
        ocupacion_pct: Math.round((pas / bus.capacidad) * 100),
        velocidad_kmh: 18 + Math.round(Math.random() * 28),
      });
    });
    if (store.reportes.length > 1500) store.reportes = store.reportes.slice(-1500);
    saveStore(store);
    notify();
  };
  tick();
  simInterval = setInterval(tick, intervalMs);
  notify();
}

export function stopSimulation() {
  if (simInterval) { clearInterval(simInterval); simInterval = null; notify(); }
}

// ============================================================
// Live updates para vista pública
// ============================================================
export function subscribeLiveBuses(
  onUpdate: (u: LiveUpdate) => void,
  rutaId?: number,
): () => void {
  const build = (): LiveUpdate => {
    const buses: BusLiveView[] = store.buses
      .filter((b) => !rutaId || b.ruta_id === rutaId)
      .map((bus) => {
        const last = store.reportes
          .filter((r) => r.bus_id === bus.id)
          .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];
        const ruta = store.rutas.find((r) => r.id === bus.ruta_id);
        const ids = ruta?.estacion_ids ?? [];
        const curId = last?.estacion_id ?? ids[0] ?? null;
        const idx = curId != null ? ids.indexOf(curId) : -1;
        const nextId = idx >= 0 ? ids[idx + 1] ?? null : null;
        const station = curId != null ? store.estaciones.find((s) => s.id === curId) : null;
        return {
          id: bus.id,
          codigo: bus.codigo,
          placa: bus.placa,
          ruta_id: bus.ruta_id,
          capacidad: bus.capacidad,
          ocupacion_actual: last?.cantidad_pasajeros ?? 0,
          estado: bus.estado,
          estacion_actual_id: curId,
          estacion_siguiente_id: nextId,
          progreso: Math.random() * 0.9,
          velocidad_kmh: last?.velocidad_kmh ?? 0,
          eta_minutos: 1 + Math.floor(Math.random() * 6),
          ultima_actualizacion: last?.timestamp ?? bus.created_at,
          latitud: last?.latitud ?? station?.latitud ?? -12.05,
          longitud: last?.longitud ?? station?.longitud ?? -77.04,
          direccion: Math.random() > 0.5 ? "sur" : "norte",
        };
      });
    return { buses, timestamp: new Date().toISOString() };
  };

  const buildFromApi = async (): Promise<LiveUpdate> => {
    const [busesResponse, reportesResponse, rutas] = await Promise.all([
      listarBuses({ page: 1, page_size: 1000, ruta_id: rutaId ?? undefined }),
      listarReportes({ page: 1, page_size: 1000 }),
      listarRutas(),
    ]);

    if (!busesResponse.ok || !busesResponse.data) {
      throw new Error(busesResponse.error?.message ?? "No se pudieron cargar los buses");
    }

    if (!reportesResponse.ok || !reportesResponse.data) {
      throw new Error(reportesResponse.error?.message ?? "No se pudieron cargar los reportes");
    }

    const latestByBus = new Map<string, Reporte>();
    const sortedReportes = [...reportesResponse.data.items].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

    sortedReportes.forEach((reporte) => {
      const busKey = String(reporte.bus_id);
      if (!latestByBus.has(busKey)) {
        latestByBus.set(busKey, reporte);
      }
    });

    const buses: BusLiveView[] = busesResponse.data.items
      .filter((bus) => !rutaId || String(bus.ruta_id) === String(rutaId))
      .map((bus) => {
        const last = latestByBus.get(String(bus.id));
        const ruta = rutas.find((item) => String(item.id) === String(bus.ruta_id));
        const ids = ruta?.estacion_ids ?? [];
        const currentStationId = last?.estacion_id ?? ids[0] ?? null;
        const currentIndex = currentStationId != null ? ids.findIndex((id) => String(id) === String(currentStationId)) : -1;
        const nextStationId = currentIndex >= 0 ? ids[currentIndex + 1] ?? null : null;

        return {
          id: bus.id,
          codigo: bus.codigo,
          placa: bus.placa,
          ruta_id: bus.ruta_id,
          capacidad: bus.capacidad,
          ocupacion_actual: last?.cantidad_pasajeros ?? 0,
          estado: bus.estado,
          estacion_actual_id: currentStationId,
          estacion_siguiente_id: nextStationId,
          progreso: Math.random() * 0.9,
          velocidad_kmh: last?.velocidad_kmh ?? 0,
          eta_minutos: 1 + Math.floor(Math.random() * 6),
          ultima_actualizacion: last?.timestamp ?? bus.created_at,
          latitud: last?.latitud ?? -12.05,
          longitud: last?.longitud ?? -77.04,
          direccion: Math.random() > 0.5 ? "sur" : "norte",
        };
      });

    return {
      buses,
      timestamp: new Date().toISOString(),
    };
  };

  if (WS_URL) {
    const ws = new WebSocket(`${WS_URL}/live/buses${rutaId ? `?ruta_id=${rutaId}` : ""}`);
    ws.onmessage = (e) => { try { onUpdate(JSON.parse(e.data)); } catch { /* */ } };
    return () => ws.close();
  }

  if (!USE_MOCK) {
    const emit = async () => {
      try {
        onUpdate(await buildFromApi());
      } catch {
        onUpdate(build());
      }
    };

    void emit();
    const interval = setInterval(() => {
      void emit();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }

  const emit = () => onUpdate(build());
  emit();
  const off = onStoreChange(emit);
  const fallback = setInterval(emit, 3000);
  return () => { off(); clearInterval(fallback); };
}
