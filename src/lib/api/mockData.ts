import type { Bus, Estacion, Reporte, Ruta, ScheduleEntry } from "./types";

// ============================================================
// Catálogo: 36 estaciones del Metropolitano (Naranjal — Matellini)
// IDs numéricos (BIGSERIAL en BD).
// ============================================================
export const ESTACIONES: Estacion[] = [
  { id: 1,  nombre: "Naranjal",          distrito: "Independencia", latitud: -11.9905, longitud: -77.0612, orden: 1 },
  { id: 2,  nombre: "Izaguirre",         distrito: "Independencia", latitud: -11.9985, longitud: -77.0620, orden: 2 },
  { id: 3,  nombre: "Pacífico",          distrito: "Independencia", latitud: -12.0050, longitud: -77.0600, orden: 3 },
  { id: 4,  nombre: "Independencia",     distrito: "Independencia", latitud: -12.0110, longitud: -77.0590, orden: 4 },
  { id: 5,  nombre: "Los Jazmines",      distrito: "Independencia", latitud: -12.0170, longitud: -77.0580, orden: 5 },
  { id: 6,  nombre: "Tomás Valle",       distrito: "SMP",           latitud: -12.0230, longitud: -77.0570, orden: 6 },
  { id: 7,  nombre: "El Milagro",        distrito: "SMP",           latitud: -12.0290, longitud: -77.0560, orden: 7 },
  { id: 8,  nombre: "Honorio Delgado",   distrito: "SMP",           latitud: -12.0350, longitud: -77.0550, orden: 8 },
  { id: 9,  nombre: "UNI",               distrito: "Rímac",         latitud: -12.0410, longitud: -77.0540, orden: 9 },
  { id: 10, nombre: "Parque del Trabajo",distrito: "Rímac",         latitud: -12.0470, longitud: -77.0530, orden: 10 },
  { id: 11, nombre: "Caquetá",           distrito: "Rímac",         latitud: -12.0530, longitud: -77.0510, orden: 11 },
  { id: 12, nombre: "Dos de Mayo",       distrito: "Cercado",       latitud: -12.0560, longitud: -77.0480, orden: 12 },
  { id: 13, nombre: "Quilca",            distrito: "Cercado",       latitud: -12.0580, longitud: -77.0450, orden: 13 },
  { id: 14, nombre: "Tacna",             distrito: "Cercado",       latitud: -12.0510, longitud: -77.0360, orden: 14 },
  { id: 15, nombre: "Jirón de la Unión", distrito: "Cercado",       latitud: -12.0490, longitud: -77.0330, orden: 15 },
  { id: 16, nombre: "Colmena",           distrito: "Cercado",       latitud: -12.0530, longitud: -77.0360, orden: 16 },
  { id: 17, nombre: "Estación Central",  distrito: "Cercado",       latitud: -12.0580, longitud: -77.0370, orden: 17 },
  { id: 18, nombre: "España",            distrito: "Cercado",       latitud: -12.0600, longitud: -77.0400, orden: 18 },
  { id: 19, nombre: "México",            distrito: "La Victoria",   latitud: -12.0700, longitud: -77.0300, orden: 19 },
  { id: 20, nombre: "Canadá",            distrito: "La Victoria",   latitud: -12.0760, longitud: -77.0240, orden: 20 },
  { id: 21, nombre: "Javier Prado",      distrito: "San Isidro",    latitud: -12.0900, longitud: -77.0220, orden: 21 },
  { id: 22, nombre: "Canaval y Moreyra", distrito: "San Isidro",    latitud: -12.0970, longitud: -77.0240, orden: 22 },
  { id: 23, nombre: "Aramburú",          distrito: "San Isidro",    latitud: -12.1030, longitud: -77.0250, orden: 23 },
  { id: 24, nombre: "Domingo Orué",      distrito: "Surquillo",     latitud: -12.1090, longitud: -77.0260, orden: 24 },
  { id: 25, nombre: "Angamos",           distrito: "Surquillo",     latitud: -12.1130, longitud: -77.0270, orden: 25 },
  { id: 26, nombre: "Ricardo Palma",     distrito: "Miraflores",    latitud: -12.1170, longitud: -77.0290, orden: 26 },
  { id: 27, nombre: "Benavides",         distrito: "Miraflores",    latitud: -12.1240, longitud: -77.0300, orden: 27 },
  { id: 28, nombre: "28 de Julio",       distrito: "Miraflores",    latitud: -12.1320, longitud: -77.0310, orden: 28 },
  { id: 29, nombre: "Plaza de Flores",   distrito: "Barranco",      latitud: -12.1390, longitud: -77.0220, orden: 29 },
  { id: 30, nombre: "Balta",             distrito: "Barranco",      latitud: -12.1450, longitud: -77.0230, orden: 30 },
  { id: 31, nombre: "Bulevar",           distrito: "Barranco",      latitud: -12.1490, longitud: -77.0240, orden: 31 },
  { id: 32, nombre: "Estadio Unión",     distrito: "Chorrillos",    latitud: -12.1640, longitud: -77.0190, orden: 32 },
  { id: 33, nombre: "Escuela Militar",   distrito: "Chorrillos",    latitud: -12.1720, longitud: -77.0170, orden: 33 },
  { id: 34, nombre: "Terán",             distrito: "Chorrillos",    latitud: -12.1810, longitud: -77.0150, orden: 34 },
  { id: 35, nombre: "Rosario de Villa",  distrito: "Chorrillos",    latitud: -12.1880, longitud: -77.0140, orden: 35 },
  { id: 36, nombre: "Matellini",         distrito: "Chorrillos",    latitud: -12.1980, longitud: -77.0130, orden: 36 },
];

export const RUTAS: Ruta[] = [
  {
    id: 1, codigo: "REG", nombre: "Regular", servicio: "Regular",
    color: "hsl(354 78% 46%)", frecuencia_min: 4,
    estacion_ids: ESTACIONES.map((s) => s.id),
    descripcion: "Recorre todas las estaciones del corredor troncal de Naranjal a Matellini.",
    horarios: {
      lun_vie: { start: "05:00", end: "23:00" },
      sabado:  { start: "05:00", end: "23:00" },
      domingo: { start: "05:30", end: "22:30" },
    },
  },
  {
    id: 2, codigo: "A", nombre: "Expreso 1", servicio: "Expreso_1",
    color: "hsl(220 80% 55%)", frecuencia_min: 6,
    estacion_ids: [1, 3, 6, 9, 11, 17, 21, 25, 27, 32, 36],
    descripcion: "Servicio expreso entre Naranjal y Matellini con paradas selectas.",
    horarios: {
      lun_vie: { start: "05:30", end: "22:00" },
      sabado:  { start: "06:00", end: "21:00" },
      domingo: { start: "06:30", end: "20:30" },
    },
  },
  {
    id: 3, codigo: "B", nombre: "Expreso 2", servicio: "Expreso_2",
    color: "hsl(142 70% 40%)", frecuencia_min: 7,
    estacion_ids: [1, 4, 8, 11, 14, 17, 19],
    descripcion: "Conecta el norte de Lima con el centro histórico rápidamente.",
    horarios: {
      lun_vie: { start: "05:30", end: "22:00" },
      sabado:  { start: "06:00", end: "21:00" },
      domingo: { start: "06:30", end: "20:30" },
    },
  },
  {
    id: 4, codigo: "C", nombre: "Expreso 4", servicio: "Expreso_4",
    color: "hsl(45 95% 50%)", frecuencia_min: 8,
    estacion_ids: [11, 14, 17, 21, 25, 27, 30, 36],
    descripcion: "Estaciones clave del centro y sur de Lima.",
    horarios: {
      lun_vie: { start: "06:00", end: "21:30" },
      sabado:  { start: "06:30", end: "20:30" },
      domingo: { start: "07:00", end: "20:00" },
    },
  },
  {
    id: 5, codigo: "D", nombre: "Expreso 7", servicio: "Expreso_7",
    color: "hsl(280 70% 55%)", frecuencia_min: 10,
    estacion_ids: [1, 6, 11, 17, 21, 26, 32, 36],
    descripcion: "Servicio nocturno con paradas estratégicas.",
    horarios: {
      lun_vie: { start: "20:00", end: "23:30" },
      sabado:  { start: "20:00", end: "23:30" },
      domingo: { start: "20:00", end: "22:30" },
    },
  },
  {
    id: 6, codigo: "SE", nombre: "SuperExpreso", servicio: "SuperExpreso",
    color: "hsl(0 0% 8%)", frecuencia_min: 12,
    estacion_ids: [1, 11, 17, 21, 26, 36],
    descripcion: "Solo estaciones principales — el viaje más rápido del corredor.",
    horarios: {
      lun_vie: { start: "06:30", end: "20:00" },
      sabado:  { start: "07:00", end: "19:00" },
      domingo: { start: "08:00", end: "18:00" },
    },
  },
];

// ============================================================
// Seeds — buses y reportes iniciales
// ============================================================
export function seedBuses(): Bus[] {
  const buses: Bus[] = [];
  let nextId = 1;
  RUTAS.forEach((ruta) => {
    const count = ruta.servicio === "Regular" ? 6 : ruta.servicio === "SuperExpreso" ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const idx = buses.length + 1;
      buses.push({
        id: nextId++,
        codigo: `${ruta.codigo}-${String(idx).padStart(3, "0")}`,
        capacidad: ruta.servicio === "Regular" ? 180 : 160,
        placa: `B${1000 + idx * 7}-${ruta.codigo}`,
        ruta_id: ruta.id,
        estado: "en_ruta",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        ultimo_reporte: null,
      });
    }
  });
  return buses;
}

export function seedReportes(): Reporte[] {
  const buses = seedBuses();
  const reps: Reporte[] = [];
  const now = Date.now();
  let nextId = 1;
  buses.forEach((bus, bi) => {
    const ruta = RUTAS.find((r) => r.id === bus.ruta_id);
    if (!ruta?.estacion_ids?.length) return;
    const stations = ruta.estacion_ids
      .map((id) => ESTACIONES.find((s) => s.id === id)!)
      .filter(Boolean);
    for (let k = 4; k >= 0; k--) {
      const st = stations[(bi + k) % stations.length];
      const pas = Math.floor(bus.capacidad * (0.3 + Math.random() * 0.5));
      reps.push({
        id: nextId++,
        bus_id: bus.id,
        latitud: st.latitud,
        longitud: st.longitud,
        cantidad_pasajeros: pas,
        timestamp: new Date(now - k * 1000 * 60 * 5).toISOString(),
        estacion_id: st.id,
        ocupacion_pct: Math.round((pas / bus.capacidad) * 100),
        velocidad_kmh: 20 + Math.floor(Math.random() * 25),
      });
    }
  });
  return reps;
}

export function generateSchedule(rutaId: number, estacionId: number): ScheduleEntry {
  const ruta = RUTAS.find((r) => r.id === rutaId);
  const llegadas: string[] = [];
  if (!ruta?.horarios) return { ruta_id: rutaId, estacion_id: estacionId, llegadas };
  const [sh, sm] = ruta.horarios.lun_vie.start.split(":").map(Number);
  const [eh, em] = ruta.horarios.lun_vie.end.split(":").map(Number);
  let mins = sh * 60 + sm;
  const end = eh * 60 + em;
  while (mins < end) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    llegadas.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    mins += ruta.frecuencia_min;
  }
  return { ruta_id: rutaId, estacion_id: estacionId, llegadas };
}
