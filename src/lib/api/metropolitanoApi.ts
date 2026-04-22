// ============================================================
// Capa de servicio del Metropolitano — MVP de gestión interna
// ------------------------------------------------------------
//
//   ENDPOINTS REST (espec. del MVP)
//   ─────────────────────────────────────────────────────
//   POST   /buses                  → crear bus
//   GET    /buses                  → listar buses
//   GET    /buses/:id              → obtener bus por id
//   DELETE /buses/:id              → eliminar bus
//   POST   /buses/:id/reportes     → registrar reporte
//   GET    /buses/estado-actual    → último estado de cada bus
//   GET    /buses/:id/historial    → historial de reportes (extra)
//   GET    /reportes               → listado global
//   WS     /buses/live             → tracking en vivo (extra)
//
//   Para usar contra un backend real, definir:
//     VITE_METROPOLITANO_API_URL
//     VITE_METROPOLITANO_WS_URL  (opcional)
//
//   Sin esas variables, el módulo opera contra un store en memoria
//   con persistencia en localStorage (modo MVP / demo).
// ============================================================

import type {
  ApiResponse,
  Bus,
  BusLiveView,
  LiveUpdate,
  Reporte,
  Route,
  ScheduleEntry,
  Station,
} from "./types";
import { ROUTES, STATIONS, generateSchedule, seedBuses, seedReportes } from "./mockData";

const API_URL = import.meta.env.VITE_METROPOLITANO_API_URL as string | undefined;
const WS_URL = import.meta.env.VITE_METROPOLITANO_WS_URL as string | undefined;
const USE_MOCK = !API_URL;

// ============================================================
// Store local (modo mock) — persistencia en localStorage
// ============================================================
const STORE_KEY = "metropolitano_store_v1";

interface Store {
  buses: Bus[];
  reportes: Reporte[];
}

function loadStore(): Store {
  if (typeof window === "undefined") return { buses: seedBuses(), reportes: seedReportes() };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      const initial: Store = { buses: seedBuses(), reportes: seedReportes() };
      localStorage.setItem(STORE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as Store;
  } catch {
    return { buses: seedBuses(), reportes: seedReportes() };
  }
}

function saveStore(s: Store) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  }
}

let store: Store = loadStore();

/** Solo para testing: limpia el store y vuelve a sembrar. */
export function resetStore() {
  store = { buses: seedBuses(), reportes: seedReportes() };
  saveStore(store);
}

// ============================================================
// Helpers
// ============================================================
function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function nearestStation(lat: number, lng: number) {
  let best = STATIONS[0];
  let bestD = Infinity;
  for (const s of STATIONS) {
    const d = (s.lat - lat) ** 2 + (s.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function attachLastReport(bus: Bus): Bus {
  const reports = store.reportes
    .filter((r) => r.busId === bus.id)
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  return { ...bus, ultimoReporte: reports[0] ?? null };
}

async function http<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? { code: "HTTP_ERROR", message: res.statusText } };
    return { ok: true, data: json as T };
  } catch (e: unknown) {
    return { ok: false, error: { code: "NETWORK", message: e instanceof Error ? e.message : "network error" } };
  }
}

// ============================================================
// Endpoints — Buses
// ============================================================

/** POST /buses */
export async function crearBus(input: { codigo: string; capacidad: number; routeId: string; plate: string }): Promise<ApiResponse<Bus>> {
  // ---- validaciones ----
  if (!input.codigo?.trim()) return { ok: false, error: { code: "VALIDATION", field: "codigo", message: "El código es obligatorio" } };
  if (!Number.isFinite(input.capacidad) || input.capacidad <= 0) {
    return { ok: false, error: { code: "VALIDATION", field: "capacidad", message: "La capacidad debe ser mayor a 0" } };
  }
  if (input.capacidad > 300) {
    return { ok: false, error: { code: "VALIDATION", field: "capacidad", message: "La capacidad máxima permitida es 300" } };
  }
  if (!ROUTES.find((r) => r.id === input.routeId)) {
    return { ok: false, error: { code: "VALIDATION", field: "routeId", message: "Ruta inválida" } };
  }
  if (store.buses.some((b) => b.codigo.toLowerCase() === input.codigo.toLowerCase())) {
    return { ok: false, error: { code: "DUPLICATE", field: "codigo", message: "Ya existe un bus con ese código" } };
  }

  if (USE_MOCK) {
    const bus: Bus = {
      id: uid("bus"),
      codigo: input.codigo.trim().toUpperCase(),
      capacidad: input.capacidad,
      routeId: input.routeId,
      plate: input.plate.trim().toUpperCase(),
      status: "en_ruta",
      createdAt: new Date().toISOString(),
      ultimoReporte: null,
    };
    store.buses = [...store.buses, bus];
    saveStore(store);
    return { ok: true, data: bus };
  }
  return http<Bus>("/buses", { method: "POST", body: JSON.stringify(input) });
}

/** GET /buses */
export async function listarBuses(): Promise<ApiResponse<Bus[]>> {
  if (USE_MOCK) {
    return { ok: true, data: store.buses.map(attachLastReport) };
  }
  return http<Bus[]>("/buses");
}

/** GET /buses/:id */
export async function obtenerBus(id: string): Promise<ApiResponse<Bus>> {
  if (USE_MOCK) {
    const bus = store.buses.find((b) => b.id === id);
    if (!bus) return { ok: false, error: { code: "NOT_FOUND", message: "Bus no encontrado" } };
    return { ok: true, data: attachLastReport(bus) };
  }
  return http<Bus>(`/buses/${id}`);
}

/** DELETE /buses/:id */
export async function eliminarBus(id: string): Promise<ApiResponse<{ id: string }>> {
  if (USE_MOCK) {
    const exists = store.buses.find((b) => b.id === id);
    if (!exists) return { ok: false, error: { code: "NOT_FOUND", message: "Bus no encontrado" } };
    store.buses = store.buses.filter((b) => b.id !== id);
    store.reportes = store.reportes.filter((r) => r.busId !== id);
    saveStore(store);
    return { ok: true, data: { id } };
  }
  return http(`/buses/${id}`, { method: "DELETE" });
}

/** PATCH /buses/:id */
export async function actualizarBus(id: string, patch: Partial<Pick<Bus, "codigo" | "capacidad" | "routeId" | "plate" | "status">>): Promise<ApiResponse<Bus>> {
  if (USE_MOCK) {
    const idx = store.buses.findIndex((b) => b.id === id);
    if (idx < 0) return { ok: false, error: { code: "NOT_FOUND", message: "Bus no encontrado" } };
    if (patch.capacidad !== undefined && patch.capacidad <= 0) {
      return { ok: false, error: { code: "VALIDATION", field: "capacidad", message: "Capacidad inválida" } };
    }
    store.buses[idx] = { ...store.buses[idx], ...patch };
    saveStore(store);
    return { ok: true, data: attachLastReport(store.buses[idx]) };
  }
  return http<Bus>(`/buses/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

/** GET /buses/estado-actual — último estado por bus */
export async function obtenerEstadoActual(): Promise<ApiResponse<Bus[]>> {
  if (USE_MOCK) {
    return { ok: true, data: store.buses.map(attachLastReport) };
  }
  return http<Bus[]>("/buses/estado-actual");
}

// ============================================================
// Endpoints — Reportes
// ============================================================

/** POST /buses/:id/reportes */
export async function registrarReporte(input: {
  busId: string;
  latitud: number;
  longitud: number;
  cantidadPasajeros: number;
  velocidadKmh?: number;
}): Promise<ApiResponse<Reporte>> {
  // validaciones
  if (typeof input.latitud !== "number" || input.latitud < -90 || input.latitud > 90)
    return { ok: false, error: { code: "VALIDATION", field: "latitud", message: "Latitud fuera de rango (-90, 90)" } };
  if (typeof input.longitud !== "number" || input.longitud < -180 || input.longitud > 180)
    return { ok: false, error: { code: "VALIDATION", field: "longitud", message: "Longitud fuera de rango (-180, 180)" } };
  if (!Number.isInteger(input.cantidadPasajeros) || input.cantidadPasajeros < 0)
    return { ok: false, error: { code: "VALIDATION", field: "cantidadPasajeros", message: "Pasajeros debe ser entero ≥ 0" } };

  if (USE_MOCK) {
    const bus = store.buses.find((b) => b.id === input.busId);
    if (!bus) return { ok: false, error: { code: "NOT_FOUND", message: "Bus no encontrado" } };

    // 🚨 regla del enunciado: pasajeros no puede exceder capacidad
    if (input.cantidadPasajeros > bus.capacidad) {
      return {
        ok: false,
        error: {
          code: "CAPACITY_EXCEEDED",
          field: "cantidadPasajeros",
          message: `Pasajeros (${input.cantidadPasajeros}) excede la capacidad del bus (${bus.capacidad}).`,
        },
      };
    }

    const station = nearestStation(input.latitud, input.longitud);
    const reporte: Reporte = {
      id: uid("rep"),
      busId: input.busId,
      latitud: input.latitud,
      longitud: input.longitud,
      cantidadPasajeros: input.cantidadPasajeros,
      timestamp: new Date().toISOString(),
      estacionId: station.id,
      ocupacionPct: Math.round((input.cantidadPasajeros / bus.capacidad) * 100),
      velocidadKmh: input.velocidadKmh,
    };
    store.reportes = [...store.reportes, reporte];
    saveStore(store);
    return { ok: true, data: reporte };
  }
  return http<Reporte>(`/buses/${input.busId}/reportes`, { method: "POST", body: JSON.stringify(input) });
}

/** GET /buses/:id/historial?limit=&desde=&hasta= */
export async function obtenerHistorial(
  busId: string,
  opts: { limit?: number; desde?: string; hasta?: string } = {},
): Promise<ApiResponse<Reporte[]>> {
  if (USE_MOCK) {
    let list = store.reportes
      .filter((r) => r.busId === busId)
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

/** GET /reportes — global */
export async function listarReportes(limit = 50): Promise<ApiResponse<Reporte[]>> {
  if (USE_MOCK) {
    const list = [...store.reportes]
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, limit);
    return { ok: true, data: list };
  }
  return http<Reporte[]>(`/reportes?limit=${limit}`);
}

// ============================================================
// Catálogos: rutas y estaciones
// ============================================================
export async function getRoutes(): Promise<Route[]> {
  if (USE_MOCK) return STATIONS && ROUTES;
  const r = await http<Route[]>("/routes");
  return r.data ?? [];
}
export async function getRouteById(id: string): Promise<Route | undefined> {
  return ROUTES.find((r) => r.id === id);
}
export async function getStations(): Promise<Station[]> {
  if (USE_MOCK) return STATIONS;
  const r = await http<Station[]>("/stations");
  return r.data ?? [];
}
export async function getSchedule(routeId: string, stationId: string): Promise<ScheduleEntry> {
  if (USE_MOCK) return generateSchedule(routeId, stationId);
  const r = await http<ScheduleEntry>(`/schedules/${routeId}/${stationId}`);
  return r.data ?? { routeId, stationId, arrivals: [] };
}

// ============================================================
// Simulación automática de movimiento (extra del enunciado)
// ============================================================
let simInterval: ReturnType<typeof setInterval> | null = null;
let simListeners = new Set<() => void>();

/** ¿Está corriendo la simulación? */
export function isSimulating(): boolean {
  return simInterval !== null;
}

/** Notifica a los suscriptores que el store cambió. */
function notify() {
  simListeners.forEach((fn) => fn());
  // Notificar también vía storage event para otros tabs
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("metropolitano:store-updated"));
  }
}

export function onStoreChange(fn: () => void): () => void {
  simListeners.add(fn);
  return () => simListeners.delete(fn);
}

/** Inicia la simulación: cada `intervalMs` mueve buses y genera reportes. */
export function startSimulation(intervalMs = 3000) {
  if (simInterval) return;
  const tick = () => {
    store.buses.forEach((bus) => {
      const route = ROUTES.find((r) => r.id === bus.routeId);
      if (!route) return;
      const stations = route.stationIds
        .map((id) => STATIONS.find((s) => s.id === id))
        .filter(Boolean) as Station[];
      if (!stations.length) return;

      const last = store.reportes
        .filter((r) => r.busId === bus.id)
        .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];

      // estación actual del bus (más cercana al último reporte) o la primera
      let curIdx = 0;
      if (last?.estacionId) {
        const i = stations.findIndex((s) => s.id === last.estacionId);
        if (i >= 0) curIdx = i;
      }
      // 30% de probabilidad de avanzar a la próxima estación
      const advance = Math.random() < 0.45;
      const nextIdx = advance ? (curIdx + 1) % stations.length : curIdx;
      const target = stations[nextIdx];

      // pequeña perturbación geográfica
      const lat = target.lat + (Math.random() - 0.5) * 0.0015;
      const lng = target.lng + (Math.random() - 0.5) * 0.0015;

      // pasajeros: variar respecto al último
      const base = last?.cantidadPasajeros ?? Math.floor(bus.capacidad * 0.4);
      const delta = Math.floor((Math.random() - 0.45) * 25);
      const pasajeros = Math.max(0, Math.min(bus.capacidad, base + delta));

      const reporte: Reporte = {
        id: uid("rep"),
        busId: bus.id,
        latitud: lat,
        longitud: lng,
        cantidadPasajeros: pasajeros,
        timestamp: new Date().toISOString(),
        estacionId: target.id,
        ocupacionPct: Math.round((pasajeros / bus.capacidad) * 100),
        velocidadKmh: 18 + Math.round(Math.random() * 28),
      };
      store.reportes.push(reporte);
    });
    // recortar histórico para no crecer infinito (~últimos 1500)
    if (store.reportes.length > 1500) {
      store.reportes = store.reportes.slice(-1500);
    }
    saveStore(store);
    notify();
  };
  tick();
  simInterval = setInterval(tick, intervalMs);
  notify();
}

export function stopSimulation() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
    notify();
  }
}

// ============================================================
// Live updates para vista pública (legado)
// ============================================================
export function subscribeLiveBuses(
  onUpdate: (update: LiveUpdate) => void,
  routeId?: string,
): () => void {
  const build = (): LiveUpdate => {
    const buses: BusLiveView[] = store.buses
      .filter((b) => !routeId || b.routeId === routeId)
      .map((bus) => {
        const last = store.reportes
          .filter((r) => r.busId === bus.id)
          .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];
        const route = ROUTES.find((r) => r.id === bus.routeId);
        const stationIds = route?.stationIds ?? [];
        const curId = last?.estacionId ?? stationIds[0] ?? "";
        const idx = stationIds.indexOf(curId);
        const nextId = idx >= 0 ? stationIds[idx + 1] ?? null : null;
        const station = STATIONS.find((s) => s.id === curId);
        return {
          id: bus.id,
          plate: bus.plate,
          routeId: bus.routeId,
          capacity: bus.capacidad,
          currentOccupancy: last?.cantidadPasajeros ?? 0,
          status: bus.status,
          currentStationId: curId,
          nextStationId: nextId,
          progress: Math.random() * 0.9,
          speed: last?.velocidadKmh ?? 0,
          etaMinutes: 1 + Math.floor(Math.random() * 6),
          lastUpdate: last?.timestamp ?? bus.createdAt,
          lat: last?.latitud ?? station?.lat ?? -12.05,
          lng: last?.longitud ?? station?.lng ?? -77.04,
          direction: Math.random() > 0.5 ? "sur" : "norte",
        };
      });
    return { buses, timestamp: new Date().toISOString() };
  };

  if (WS_URL) {
    const ws = new WebSocket(`${WS_URL}/buses${routeId ? `?routeId=${routeId}` : ""}`);
    ws.onmessage = (e) => {
      try { onUpdate(JSON.parse(e.data)); } catch { /* noop */ }
    };
    return () => ws.close();
  }

  // mock: emitir cuando cambie el store y cada 3s como fallback
  const emit = () => onUpdate(build());
  emit();
  const off = onStoreChange(emit);
  const interval = setInterval(emit, 3000);
  return () => { off(); clearInterval(interval); };
}
