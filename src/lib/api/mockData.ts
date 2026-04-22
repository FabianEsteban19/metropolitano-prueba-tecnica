import type { Bus, Route, Station, ScheduleEntry } from "./types";

// ============================================================
// Datos mock basados en el Metropolitano de Lima
// (38 estaciones aprox. del corredor troncal Naranjal — Matellini)
// ============================================================

export const STATIONS: Station[] = [
  { id: "st-01", name: "Naranjal", order: 0, district: "Independencia", lat: -11.9905, lng: -77.0612 },
  { id: "st-02", name: "Izaguirre", order: 1, district: "Independencia", lat: -11.9985, lng: -77.0620 },
  { id: "st-03", name: "Pacífico", order: 2, district: "Independencia", lat: -12.0050, lng: -77.0600 },
  { id: "st-04", name: "Independencia", order: 3, district: "Independencia", lat: -12.0110, lng: -77.0590 },
  { id: "st-05", name: "Los Jazmines", order: 4, district: "Independencia", lat: -12.0170, lng: -77.0580 },
  { id: "st-06", name: "Tomás Valle", order: 5, district: "SMP", lat: -12.0230, lng: -77.0570 },
  { id: "st-07", name: "El Milagro", order: 6, district: "SMP", lat: -12.0290, lng: -77.0560 },
  { id: "st-08", name: "Honorio Delgado", order: 7, district: "SMP", lat: -12.0350, lng: -77.0550 },
  { id: "st-09", name: "UNI", order: 8, district: "Rímac", lat: -12.0410, lng: -77.0540 },
  { id: "st-10", name: "Parque del Trabajo", order: 9, district: "Rímac", lat: -12.0470, lng: -77.0530 },
  { id: "st-11", name: "Caquetá", order: 10, district: "Rímac", lat: -12.0530, lng: -77.0510 },
  { id: "st-12", name: "Dos de Mayo", order: 11, district: "Cercado", lat: -12.0560, lng: -77.0480 },
  { id: "st-13", name: "Quilca", order: 12, district: "Cercado", lat: -12.0580, lng: -77.0450 },
  { id: "st-14", name: "Tacna", order: 13, district: "Cercado", lat: -12.0510, lng: -77.0360 },
  { id: "st-15", name: "Jirón de la Unión", order: 14, district: "Cercado", lat: -12.0490, lng: -77.0330 },
  { id: "st-16", name: "Colmena", order: 15, district: "Cercado", lat: -12.0530, lng: -77.0360 },
  { id: "st-17", name: "Estación Central", order: 16, district: "Cercado", lat: -12.0580, lng: -77.0370 },
  { id: "st-18", name: "España", order: 17, district: "Cercado", lat: -12.0600, lng: -77.0400 },
  { id: "st-19", name: "México", order: 18, district: "La Victoria", lat: -12.0700, lng: -77.0300 },
  { id: "st-20", name: "Canadá", order: 19, district: "La Victoria", lat: -12.0760, lng: -77.0240 },
  { id: "st-21", name: "Javier Prado", order: 20, district: "San Isidro", lat: -12.0900, lng: -77.0220 },
  { id: "st-22", name: "Canaval y Moreyra", order: 21, district: "San Isidro", lat: -12.0970, lng: -77.0240 },
  { id: "st-23", name: "Aramburú", order: 22, district: "San Isidro", lat: -12.1030, lng: -77.0250 },
  { id: "st-24", name: "Domingo Orué", order: 23, district: "Surquillo", lat: -12.1090, lng: -77.0260 },
  { id: "st-25", name: "Angamos", order: 24, district: "Surquillo", lat: -12.1130, lng: -77.0270 },
  { id: "st-26", name: "Ricardo Palma", order: 25, district: "Miraflores", lat: -12.1170, lng: -77.0290 },
  { id: "st-27", name: "Benavides", order: 26, district: "Miraflores", lat: -12.1240, lng: -77.0300 },
  { id: "st-28", name: "28 de Julio", order: 27, district: "Miraflores", lat: -12.1320, lng: -77.0310 },
  { id: "st-29", name: "Plaza de Flores", order: 28, district: "Barranco", lat: -12.1390, lng: -77.0220 },
  { id: "st-30", name: "Balta", order: 29, district: "Barranco", lat: -12.1450, lng: -77.0230 },
  { id: "st-31", name: "Bulevar", order: 30, district: "Barranco", lat: -12.1490, lng: -77.0240 },
  { id: "st-32", name: "Estadio Unión", order: 31, district: "Chorrillos", lat: -12.1640, lng: -77.0190 },
  { id: "st-33", name: "Escuela Militar", order: 32, district: "Chorrillos", lat: -12.1720, lng: -77.0170 },
  { id: "st-34", name: "Terán", order: 33, district: "Chorrillos", lat: -12.1810, lng: -77.0150 },
  { id: "st-35", name: "Rosario de Villa", order: 34, district: "Chorrillos", lat: -12.1880, lng: -77.0140 },
  { id: "st-36", name: "Matellini", order: 35, district: "Chorrillos", lat: -12.1980, lng: -77.0130 },
];

export const ROUTES: Route[] = [
  {
    id: "rt-regular",
    code: "REG",
    name: "Regular",
    service: "Regular",
    color: "hsl(354 78% 46%)",
    description: "Recorre todas las estaciones del corredor troncal de Naranjal a Matellini.",
    stationIds: STATIONS.map((s) => s.id),
    operatingHours: {
      weekday: { start: "05:00", end: "23:00" },
      saturday: { start: "05:00", end: "23:00" },
      sunday: { start: "05:30", end: "22:30" },
    },
    frequencyMinutes: 4,
  },
  {
    id: "rt-exp1",
    code: "A",
    name: "Expreso 1",
    service: "Expreso 1",
    color: "hsl(220 80% 55%)",
    description: "Servicio expreso entre Naranjal y Matellini con paradas selectas.",
    stationIds: ["st-01", "st-03", "st-06", "st-09", "st-11", "st-17", "st-21", "st-25", "st-27", "st-32", "st-36"],
    operatingHours: {
      weekday: { start: "05:30", end: "22:00" },
      saturday: { start: "06:00", end: "21:00" },
      sunday: { start: "06:30", end: "20:30" },
    },
    frequencyMinutes: 6,
  },
  {
    id: "rt-exp2",
    code: "B",
    name: "Expreso 2",
    service: "Expreso 2",
    color: "hsl(142 70% 40%)",
    description: "Conecta el norte de Lima con el centro histórico rápidamente.",
    stationIds: ["st-01", "st-04", "st-08", "st-11", "st-14", "st-17", "st-19"],
    operatingHours: {
      weekday: { start: "05:30", end: "22:00" },
      saturday: { start: "06:00", end: "21:00" },
      sunday: { start: "06:30", end: "20:30" },
    },
    frequencyMinutes: 7,
  },
  {
    id: "rt-exp4",
    code: "C",
    name: "Expreso 4",
    service: "Expreso 4",
    color: "hsl(45 95% 50%)",
    description: "Estaciones clave del centro y sur de Lima.",
    stationIds: ["st-11", "st-14", "st-17", "st-21", "st-25", "st-27", "st-30", "st-36"],
    operatingHours: {
      weekday: { start: "06:00", end: "21:30" },
      saturday: { start: "06:30", end: "20:30" },
      sunday: { start: "07:00", end: "20:00" },
    },
    frequencyMinutes: 8,
  },
  {
    id: "rt-exp7",
    code: "D",
    name: "Expreso 7",
    service: "Expreso 7",
    color: "hsl(280 70% 55%)",
    description: "Servicio nocturno con paradas estratégicas.",
    stationIds: ["st-01", "st-06", "st-11", "st-17", "st-21", "st-26", "st-32", "st-36"],
    operatingHours: {
      weekday: { start: "20:00", end: "23:30" },
      saturday: { start: "20:00", end: "23:30" },
      sunday: { start: "20:00", end: "22:30" },
    },
    frequencyMinutes: 10,
  },
  {
    id: "rt-super",
    code: "SE",
    name: "SuperExpreso",
    service: "SuperExpreso",
    color: "hsl(0 0% 8%)",
    description: "Solo estaciones principales — el viaje más rápido del corredor.",
    stationIds: ["st-01", "st-11", "st-17", "st-21", "st-26", "st-36"],
    operatingHours: {
      weekday: { start: "06:30", end: "20:00" },
      saturday: { start: "07:00", end: "19:00" },
      sunday: { start: "08:00", end: "18:00" },
    },
    frequencyMinutes: 12,
  },
];

// Generador determinístico de buses
function makeBus(idx: number, route: Route): Bus {
  const stationIdx = (idx * 3) % route.stationIds.length;
  const currentStationId = route.stationIds[stationIdx];
  const nextStationId = route.stationIds[stationIdx + 1] ?? null;
  const station = STATIONS.find((s) => s.id === currentStationId)!;
  const capacity = route.service === "SuperExpreso" ? 160 : route.service === "Regular" ? 180 : 160;
  const occupancy = 30 + ((idx * 37) % (capacity - 30));
  const statuses: Bus["status"][] = ["en_ruta", "en_estacion", "en_ruta", "retraso", "en_ruta"];
  return {
    id: `bus-${route.code}-${String(idx).padStart(3, "0")}`,
    plate: `B${1000 + idx * 7}-${route.code}`,
    routeId: route.id,
    capacity,
    currentOccupancy: occupancy,
    status: statuses[idx % statuses.length],
    currentStationId,
    nextStationId,
    progress: ((idx * 17) % 100) / 100,
    speed: 25 + ((idx * 5) % 30),
    etaMinutes: 1 + ((idx * 3) % 8),
    lastUpdate: new Date().toISOString(),
    lat: station.lat + (Math.random() - 0.5) * 0.002,
    lng: station.lng + (Math.random() - 0.5) * 0.002,
    direction: idx % 2 === 0 ? "sur" : "norte",
  };
}

export function generateMockBuses(): Bus[] {
  const buses: Bus[] = [];
  ROUTES.forEach((route) => {
    const count = route.service === "Regular" ? 12 : route.service === "SuperExpreso" ? 4 : 6;
    for (let i = 0; i < count; i++) {
      buses.push(makeBus(i, route));
    }
  });
  return buses;
}

export function generateSchedule(routeId: string, stationId: string): ScheduleEntry {
  const route = ROUTES.find((r) => r.id === routeId)!;
  const arrivals: string[] = [];
  const [sh, sm] = route.operatingHours.weekday.start.split(":").map(Number);
  const [eh, em] = route.operatingHours.weekday.end.split(":").map(Number);
  let mins = sh * 60 + sm;
  const end = eh * 60 + em;
  while (mins < end) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    arrivals.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    mins += route.frequencyMinutes;
  }
  return { routeId, stationId, arrivals };
}
