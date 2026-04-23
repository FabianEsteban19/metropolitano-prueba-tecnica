import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { listarRutas, obtenerHorario, listarEstaciones } from "@/lib/api/metropolitanoApi";
import type { Estacion, Ruta, ScheduleEntry } from "@/lib/api/types";

interface Props {
  routeId: number | null;
}

export const ScheduleSection = ({ routeId }: Props) => {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [stationId, setStationId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry | null>(null);

  useEffect(() => {
    Promise.all([listarRutas(), listarEstaciones()]).then(([r, s]) => {
      setRutas(r);
      setEstaciones(s);
    });
  }, []);

  const ruta = useMemo(() => rutas.find((r) => r.id === routeId), [rutas, routeId]);
  const rutaEstaciones = useMemo(
    () => (ruta?.estacion_ids ? estaciones.filter((s) => ruta.estacion_ids!.includes(s.id)).sort((a, b) => a.orden - b.orden) : []),
    [ruta, estaciones],
  );

  useEffect(() => {
    if (rutaEstaciones.length && !rutaEstaciones.find((s) => s.id === stationId)) {
      setStationId(rutaEstaciones[0].id);
    }
  }, [rutaEstaciones, stationId]);

  useEffect(() => {
    if (routeId && stationId) {
      obtenerHorario(routeId, stationId).then(setSchedule);
    }
  }, [routeId, stationId]);

  if (!ruta) {
    return (
      <section id="horarios" className="container py-20">
        <p className="text-muted-foreground">Selecciona una ruta para ver sus horarios.</p>
      </section>
    );
  }

  const now = new Date();
  const upcoming = (schedule?.llegadas ?? []).filter((t) => {
    const [h, m] = t.split(":").map(Number);
    const at = new Date();
    at.setHours(h, m, 0, 0);
    return at >= now;
  }).slice(0, 8);

  const horarios = ruta.horarios;

  return (
    <section id="horarios" className="bg-secondary text-secondary-foreground py-20">
      <div className="container">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">02 · Horarios</div>
            <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight">
              {ruta.nombre}
            </h2>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-70">Estación:</span>
            <select
              value={stationId ?? ""}
              onChange={(e) => setStationId(Number(e.target.value))}
              className="bg-background/10 border border-background/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {rutaEstaciones.map((s) => (
                <option key={s.id} value={s.id} className="bg-secondary">
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-background/5 border border-background/10 p-6">
            <h3 className="font-display font-semibold mb-4 text-accent">Horario de operación</h3>
            <ul className="space-y-3 text-sm">
              {horarios && (
                <>
                  <li className="flex justify-between"><span>Lun — Vie</span><span className="font-mono">{horarios.lun_vie.start} – {horarios.lun_vie.end}</span></li>
                  <li className="flex justify-between"><span>Sábado</span><span className="font-mono">{horarios.sabado.start} – {horarios.sabado.end}</span></li>
                  <li className="flex justify-between"><span>Domingo</span><span className="font-mono">{horarios.domingo.start} – {horarios.domingo.end}</span></li>
                </>
              )}
              <li className="flex justify-between border-t border-background/10 pt-3 mt-3"><span>Frecuencia</span><span className="font-mono">cada {ruta.frecuencia_min} min</span></li>
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
