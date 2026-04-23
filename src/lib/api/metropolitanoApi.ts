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

const API_URL = import.meta.env.VITE_METROPOLITANO_API_URL as string | undefined;
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

async function http<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("metropolitano_token") : null;
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error ?? { code: "HTTP_ERROR", message: json.message ?? res.statusText } };
    }
    return { ok: true, data: json as T };
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
    if (params.ruta_id) list = list.filter((b) => b.ruta_id === params.ruta_id);
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
  return http<Paginated<Bus>>(`/buses?${qs.toString()}`);
}

/** GET /buses/:id */
export async function obtenerBus(id: number): Promise<ApiResponse<Bus>> {
  if (USE_MOCK) {
    const bus = store.buses.find((b) => b.id === id);
    if (!bus) return { ok: false, error: { code: "NOT_FOUND", message: "Bus no encontrado" } };
    return { ok: true, data: attachUltimoReporte(bus) };
  }
  return http<Bus>(`/buses/${id}`);
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
    if (input.ruta_id && !store.rutas.find((r) => r.id === input.ruta_id))
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
  return http<Bus>("/buses", { method: "POST", body: JSON.stringify(input) });
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
  return http<Bus>(`/buses/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
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
  return http<Bus[]>("/buses/estado-actual");
}

// ============================================================
// Endpoints — Reportes
// ============================================================

/** POST /buses/:id/reportes */
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
  return http<Reporte>(`/buses/${input.bus_id}/reportes`, { method: "POST", body: JSON.stringify(input) });
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
  return http<Reporte[]>(`/buses/${busId}/historial?${qs.toString()}`);
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
  return http<Paginated<Reporte>>(`/reportes?${qs.toString()}`);
}

// ============================================================
// Endpoints — Rutas
// ============================================================
export async function listarRutas(): Promise<Ruta[]> {
  if (USE_MOCK) return [...store.rutas];
  const r = await http<Ruta[]>("/rutas");
  return r.data ?? [];
}

export async function obtenerRuta(id: number): Promise<ApiResponse<Ruta>> {
  if (USE_MOCK) {
    const r = store.rutas.find((x) => x.id === id);
    return r ? { ok: true, data: r } : { ok: false, error: { code: "NOT_FOUND", message: "Ruta no encontrada" } };
  }
  return http<Ruta>(`/rutas/${id}`);
}

export async function crearRuta(dto: CreateRutaDto): Promise<ApiResponse<Ruta>> {
  if (!dto.codigo?.trim()) return { ok: false, error: { code: "VALIDATION", field: "codigo", message: "Código requerido" } };
  if (!dto.nombre?.trim()) return { ok: false, error: { code: "VALIDATION", field: "nombre", message: "Nombre requerido" } };
  if (USE_MOCK) {
    if (store.rutas.some((r) => r.codigo.toLowerCase() === dto.codigo.toLowerCase()))
      return { ok: false, error: { code: "DUPLICATE", field: "codigo", message: "Código de ruta duplicado" } };
    const ruta: Ruta = {
      id: store.next_ruta_id++, ...dto,
      codigo: dto.codigo.trim().toUpperCase(),
      estacion_ids: [],
    };
    store.rutas.push(ruta);
    saveStore(store);
    notify();
    return { ok: true, data: ruta };
  }
  return http<Ruta>("/rutas", { method: "POST", body: JSON.stringify(dto) });
}

export async function actualizarRuta(id: number, patch: UpdateRutaDto): Promise<ApiResponse<Ruta>> {
  if (USE_MOCK) {
    const idx = store.rutas.findIndex((r) => r.id === id);
    if (idx < 0) return { ok: false, error: { code: "NOT_FOUND", message: "Ruta no encontrada" } };
    store.rutas[idx] = { ...store.rutas[idx], ...patch };
    saveStore(store);
    notify();
    return { ok: true, data: store.rutas[idx] };
  }
  return http<Ruta>(`/rutas/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
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
  return http(`/rutas/${id}`, { method: "DELETE" });
}

// ============================================================
// Endpoints — Estaciones
// ============================================================
export async function listarEstaciones(): Promise<Estacion[]> {
  if (USE_MOCK) return [...store.estaciones].sort((a, b) => a.orden - b.orden);
  const r = await http<Estacion[]>("/estaciones");
  return r.data ?? [];
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
  return http<Estacion>("/estaciones", { method: "POST", body: JSON.stringify(dto) });
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
  return http<Estacion>(`/estaciones/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
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

  if (WS_URL) {
    const ws = new WebSocket(`${WS_URL}/live/buses${rutaId ? `?ruta_id=${rutaId}` : ""}`);
    ws.onmessage = (e) => { try { onUpdate(JSON.parse(e.data)); } catch { /* */ } };
    return () => ws.close();
  }

  const emit = () => onUpdate(build());
  emit();
  const off = onStoreChange(emit);
  const fallback = setInterval(emit, 3000);
  return () => { off(); clearInterval(fallback); };
}
