import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { getRoutes, getSchedule, getStations } from "@/lib/api/metropolitanoApi";
import type { Route, ScheduleEntry, Station } from "@/lib/api/types";

interface Props {
  routeId: string | null;
}

export const ScheduleSection = ({ routeId }: Props) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState<string>("");
  const [schedule, setSchedule] = useState<ScheduleEntry | null>(null);

  useEffect(() => {
    Promise.all([getRoutes(), getStations()]).then(([r, s]) => {
      setRoutes(r);
      setStations(s);
    });
  }, []);

  const route = useMemo(() => routes.find((r) => r.id === routeId), [routes, routeId]);
  const routeStations = useMemo(
    () => (route ? stations.filter((s) => route.stationIds.includes(s.id)).sort((a, b) => a.order - b.order) : []),
    [route, stations],
  );

  useEffect(() => {
    if (routeStations.length && !routeStations.find((s) => s.id === stationId)) {
      setStationId(routeStations[0].id);
    }
  }, [routeStations, stationId]);

  useEffect(() => {
    if (routeId && stationId) {
      getSchedule(routeId, stationId).then(setSchedule);
    }
  }, [routeId, stationId]);

  if (!route) {
    return (
      <section id="horarios" className="container py-20">
        <p className="text-muted-foreground">Selecciona una ruta para ver sus horarios.</p>
      </section>
    );
  }

  // Próximas 6 llegadas a partir de "ahora"
  const now = new Date();
  const upcoming = (schedule?.arrivals ?? []).filter((t) => {
    const [h, m] = t.split(":").map(Number);
    const at = new Date();
    at.setHours(h, m, 0, 0);
    return at >= now;
  }).slice(0, 8);

  return (
    <section id="horarios" className="bg-secondary text-secondary-foreground py-20">
      <div className="container">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">02 · Horarios</div>
            <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight">
              {route.name}
            </h2>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-70">Estación:</span>
            <select
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="bg-background/10 border border-background/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {routeStations.map((s) => (
                <option key={s.id} value={s.id} className="bg-secondary">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-background/5 border border-background/10 p-6">
            <h3 className="font-display font-semibold mb-4 text-accent">Horario de operación</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span>Lun — Vie</span><span className="font-mono">{route.operatingHours.weekday.start} – {route.operatingHours.weekday.end}</span></li>
              <li className="flex justify-between"><span>Sábado</span><span className="font-mono">{route.operatingHours.saturday.start} – {route.operatingHours.saturday.end}</span></li>
              <li className="flex justify-between"><span>Domingo</span><span className="font-mono">{route.operatingHours.sunday.start} – {route.operatingHours.sunday.end}</span></li>
              <li className="flex justify-between border-t border-background/10 pt-3 mt-3"><span>Frecuencia</span><span className="font-mono">cada {route.frequencyMinutes} min</span></li>
            </ul>
          </div>

          <div className="lg:col-span-2 rounded-2xl bg-background/5 border border-background/10 p-6">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2 text-accent">
              <Clock className="w-4 h-4" /> Próximas llegadas
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm opacity-70">No hay más llegadas hoy. El servicio se reanuda mañana.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {upcoming.map((t, i) => (
                  <div
                    key={t}
                    className={`rounded-xl p-4 text-center transition-smooth ${
                      i === 0
                        ? "bg-accent text-accent-foreground shadow-lg scale-105"
                        : "bg-background/10 hover:bg-background/15"
                    }`}
                  >
                    <div className="font-display font-bold text-xl">{t}</div>
                    <div className="text-[10px] uppercase tracking-wider mt-1 opacity-80">
                      {i === 0 ? "Próximo" : `+${i}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
