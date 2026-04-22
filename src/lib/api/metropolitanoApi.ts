// ============================================================
// Capa de servicio del Metropolitano
// ------------------------------------------------------------
// Esta capa está LISTA PARA ENDPOINTS reales.
// Para conectar al backend real, basta con:
//   1. Definir VITE_METROPOLITANO_API_URL en tu entorno.
//   2. (Opcional) VITE_METROPOLITANO_WS_URL para websocket en vivo.
//   3. El código automáticamente usará HTTP/WS reales en lugar del mock.
// ============================================================

import type { Bus, LiveUpdate, Route, ScheduleEntry, Station } from "./types";
import { ROUTES, STATIONS, generateMockBuses, generateSchedule } from "./mockData";

const API_URL = import.meta.env.VITE_METROPOLITANO_API_URL as string | undefined;
const WS_URL = import.meta.env.VITE_METROPOLITANO_WS_URL as string | undefined;
const USE_MOCK = !API_URL;

// ------------------------------------------------------------
// Helpers HTTP
// ------------------------------------------------------------
async function http<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

// ------------------------------------------------------------
// Endpoints públicos
// ------------------------------------------------------------

/** GET /stations */
export async function getStations(): Promise<Station[]> {
  if (USE_MOCK) return Promise.resolve(STATIONS);
  return http<Station[]>("/stations");
}

/** GET /routes */
export async function getRoutes(): Promise<Route[]> {
  if (USE_MOCK) return Promise.resolve(ROUTES);
  return http<Route[]>("/routes");
}

/** GET /routes/:id */
export async function getRouteById(id: string): Promise<Route | undefined> {
  if (USE_MOCK) return Promise.resolve(ROUTES.find((r) => r.id === id));
  return http<Route>(`/routes/${id}`);
}

/** GET /buses?routeId=... */
export async function getBuses(routeId?: string): Promise<Bus[]> {
  if (USE_MOCK) {
    const buses = generateMockBuses();
    return Promise.resolve(routeId ? buses.filter((b) => b.routeId === routeId) : buses);
  }
  const qs = routeId ? `?routeId=${encodeURIComponent(routeId)}` : "";
  return http<Bus[]>(`/buses${qs}`);
}

/** GET /schedules/:routeId/:stationId */
export async function getSchedule(routeId: string, stationId: string): Promise<ScheduleEntry> {
  if (USE_MOCK) return Promise.resolve(generateSchedule(routeId, stationId));
  return http<ScheduleEntry>(`/schedules/${routeId}/${stationId}`);
}

// ------------------------------------------------------------
// Live updates (WebSocket o polling como fallback)
// ------------------------------------------------------------

/**
 * Suscribirse a actualizaciones en vivo de buses.
 * - En producción: usa WebSocket en VITE_METROPOLITANO_WS_URL.
 * - En mock/dev: simula movimiento cada 3 s.
 *
 * @returns función `unsubscribe`
 */
export function subscribeLiveBuses(
  onUpdate: (update: LiveUpdate) => void,
  routeId?: string,
): () => void {
  // ---- Modo real con WebSocket ----
  if (WS_URL) {
    const url = `${WS_URL}/buses${routeId ? `?routeId=${routeId}` : ""}`;
    const ws = new WebSocket(url);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as LiveUpdate;
        onUpdate(data);
      } catch (e) {
        console.error("WS parse error", e);
      }
    };
    return () => ws.close();
  }

  // ---- Modo real con polling HTTP ----
  if (API_URL) {
    let active = true;
    const tick = async () => {
      if (!active) return;
      try {
        const buses = await getBuses(routeId);
        onUpdate({ buses, timestamp: new Date().toISOString() });
      } catch (e) {
        console.error("polling error", e);
      }
      if (active) setTimeout(tick, 3000);
    };
    tick();
    return () => {
      active = false;
    };
  }

  // ---- Modo mock: simulación local ----
  let active = true;
  let buses = generateMockBuses();
  if (routeId) buses = buses.filter((b) => b.routeId === routeId);

  const tick = () => {
    if (!active) return;
    buses = buses.map((bus) => {
      const route = ROUTES.find((r) => r.id === bus.routeId);
      if (!route) return bus;

      let progress = bus.progress + 0.08 + Math.random() * 0.05;
      let currentStationId = bus.currentStationId;
      let nextStationId = bus.nextStationId;
      let status: Bus["status"] = "en_ruta";

      if (progress >= 1) {
        progress = 0;
        const idx = route.stationIds.indexOf(bus.currentStationId);
        const newIdx = (idx + 1) % route.stationIds.length;
        currentStationId = route.stationIds[newIdx];
        nextStationId = route.stationIds[newIdx + 1] ?? route.stationIds[0];
        status = "en_estacion";
      }

      const occChange = Math.floor((Math.random() - 0.5) * 20);
      const newOcc = Math.max(10, Math.min(bus.capacity, bus.currentOccupancy + occChange));
      const station = STATIONS.find((s) => s.id === currentStationId)!;

      return {
        ...bus,
        progress,
        currentStationId,
        nextStationId,
        status,
        currentOccupancy: newOcc,
        speed: 20 + Math.random() * 25,
        etaMinutes: Math.max(1, Math.round((1 - progress) * 6)),
        lat: station.lat + (Math.random() - 0.5) * 0.002,
        lng: station.lng + (Math.random() - 0.5) * 0.002,
        lastUpdate: new Date().toISOString(),
      };
    });
    onUpdate({ buses, timestamp: new Date().toISOString() });
  };

  const interval = setInterval(tick, 3000);
  tick();
  return () => {
    active = false;
    clearInterval(interval);
  };
}
