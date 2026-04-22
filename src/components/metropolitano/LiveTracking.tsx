import { useEffect, useMemo, useState } from "react";
import { Activity, Wifi } from "lucide-react";
import { getStations, subscribeLiveBuses, getRoutes } from "@/lib/api/metropolitanoApi";
import type { Bus, Route, Station } from "@/lib/api/types";
import { BusCard } from "./BusCard";

interface Props {
  routeId: string | null;
}

export const LiveTracking = ({ routeId }: Props) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [filter, setFilter] = useState<"todos" | "en_ruta" | "en_estacion" | "retraso">("todos");

  useEffect(() => {
    Promise.all([getStations(), getRoutes()]).then(([s, r]) => {
      setStations(s);
      setRoutes(r);
    });
  }, []);

  useEffect(() => {
    const unsub = subscribeLiveBuses((u) => {
      setBuses(u.buses);
      setLastUpdate(u.timestamp);
    }, routeId ?? undefined);
    return unsub;
  }, [routeId]);

  const route = routes.find((r) => r.id === routeId);
  const routeStations = useMemo(
    () =>
      route
        ? stations.filter((s) => route.stationIds.includes(s.id)).sort((a, b) => a.order - b.order)
        : stations,
    [route, stations],
  );

  const filtered = filter === "todos" ? buses : buses.filter((b) => b.status === filter);

  // Estadísticas
  const stats = {
    total: buses.length,
    enRuta: buses.filter((b) => b.status === "en_ruta").length,
    enEstacion: buses.filter((b) => b.status === "en_estacion").length,
    retraso: buses.filter((b) => b.status === "retraso").length,
    aforoMedio: buses.length
      ? Math.round((buses.reduce((a, b) => a + b.currentOccupancy / b.capacity, 0) / buses.length) * 100)
      : 0,
  };

  return (
    <section id="en-vivo" className="container py-20">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">03 · En vivo</div>
          <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight">
            Buses en este momento
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl">
            {route
              ? <>Mostrando flota del servicio <strong className="text-foreground">{route.name}</strong>.</>
              : "Mostrando la flota completa del corredor."}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/30">
            <span className="w-2 h-2 rounded-full bg-success pulse-live" />
            <Wifi className="w-3 h-3" /> En vivo
          </span>
          {lastUpdate && (
            <span className="text-muted-foreground">
              Última actualización: {new Date(lastUpdate).toLocaleTimeString("es-PE")}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Total buses", value: stats.total, color: "text-foreground" },
          { label: "En ruta", value: stats.enRuta, color: "text-success" },
          { label: "En estación", value: stats.enEstacion, color: "text-primary" },
          { label: "Con retraso", value: stats.retraso, color: "text-warning" },
          { label: "Aforo medio", value: `${stats.aforoMedio}%`, color: "text-accent-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["todos", "en_ruta", "en_estacion", "retraso"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-smooth ${
              filter === f
                ? "bg-primary text-primary-foreground shadow-elegant"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {f === "todos" ? "Todos" : f.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Lista de buses */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
          No hay buses con este estado en este momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((bus) => (
            <BusCard key={bus.id} bus={bus} stations={routeStations.length ? routeStations : stations} />
          ))}
        </div>
      )}

      {/* Mapa lineal de la ruta */}
      {route && (
        <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display font-bold text-xl mb-1">Estaciones del recorrido</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Posición aproximada de cada bus a lo largo del corredor.
          </p>
          <div className="relative">
            <div className="absolute left-0 right-0 top-1/2 h-1 gradient-route rounded-full -translate-y-1/2" />
            <ol className="relative grid gap-y-6" style={{ gridTemplateColumns: `repeat(${routeStations.length}, minmax(0, 1fr))` }}>
              {routeStations.map((st) => {
                const here = buses.filter((b) => b.currentStationId === st.id).length;
                return (
                  <li key={st.id} className="flex flex-col items-center text-center relative">
                    <div className={`w-4 h-4 rounded-full border-2 border-background z-10 ${here ? "bg-primary shadow-glow" : "bg-muted-foreground/40"}`} />
                    {here > 0 && (
                      <span className="absolute -top-6 text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                        {here}
                      </span>
                    )}
                    <span className="text-[10px] mt-2 max-w-[60px] truncate text-muted-foreground" title={st.name}>
                      {st.name}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
};
