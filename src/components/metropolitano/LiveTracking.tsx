import { useMemo, useState } from "react";
import { Activity, Wifi } from "lucide-react";

import type {
  PublicBusLiveView,
  PublicEstacion,
  PublicRuta,
  PublicRutaEstacion,
} from "@/features/public-transit/types";
import { BusCard } from "./BusCard";

interface Props {
  routeId: string | null;
  buses: PublicBusLiveView[];
  estaciones: PublicEstacion[];
  rutas: PublicRuta[];
  routeStationsByRouteId: Record<string, PublicRutaEstacion[]>;
  lastUpdate: string;
}

export const LiveTracking = ({ routeId, buses, estaciones, rutas, routeStationsByRouteId, lastUpdate }: Props) => {
  const [filter, setFilter] = useState<"todos" | PublicBusLiveView["estado"]>("todos");

  const ruta = rutas.find((item) => item.id === routeId) ?? null;
  const rutaEstaciones = useMemo(
    () =>
      routeId
        ? (routeStationsByRouteId[routeId] ?? [])
            .map((row) => estaciones.find((station) => station.id === row.estacionId))
            .filter((station): station is PublicEstacion => Boolean(station))
        : estaciones,
    [routeId, routeStationsByRouteId, estaciones],
  );

  const busesFiltradosPorRuta = routeId ? buses.filter((bus) => bus.rutaId === routeId) : buses;
  const filtered = filter === "todos" ? busesFiltradosPorRuta : busesFiltradosPorRuta.filter((bus) => bus.estado === filter);

  const stats = {
    total: busesFiltradosPorRuta.length,
    enRuta: busesFiltradosPorRuta.filter((bus) => bus.estado === "en_ruta").length,
    enEstacion: busesFiltradosPorRuta.filter((bus) => bus.estado === "en_estacion").length,
    retraso: busesFiltradosPorRuta.filter((bus) => bus.estado === "retraso").length,
    aforoMedio: busesFiltradosPorRuta.length
      ? Math.round((busesFiltradosPorRuta.reduce((acc, bus) => acc + bus.ocupacionActual / Math.max(1, bus.capacidad), 0) / busesFiltradosPorRuta.length) * 100)
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
            {ruta
              ? <>Mostrando flota del servicio <strong className="text-foreground">{ruta.nombre}</strong>.</>
              : "Mostrando la flota completa del corredor."}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/30">
            <span className="w-2 h-2 rounded-full bg-success pulse-live" />
            <Wifi className="w-3 h-3" /> API pública
          </span>
          {lastUpdate && (
            <span className="text-muted-foreground">
              Última actualización: {new Date(lastUpdate).toLocaleTimeString("es-PE")}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Total buses", value: stats.total, color: "text-foreground" },
          { label: "En ruta", value: stats.enRuta, color: "text-success" },
          { label: "En estación", value: stats.enEstacion, color: "text-primary" },
          { label: "Con retraso", value: stats.retraso, color: "text-warning" },
          { label: "Aforo medio", value: `${stats.aforoMedio}%`, color: "text-accent-foreground" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className={`font-display font-bold text-2xl ${item.color}`}>{item.value}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["todos", "en_ruta", "en_estacion", "retraso"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-smooth ${
              filter === value
                ? "bg-primary text-primary-foreground shadow-elegant"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {value === "todos" ? "Todos" : value.replace("_", " ").replace(/^\w/, (char) => char.toUpperCase())}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
          No hay buses con este estado en este momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((bus) => (
            <BusCard key={bus.id} bus={bus} estaciones={rutaEstaciones.length ? rutaEstaciones : estaciones} />
          ))}
        </div>
      )}

      {ruta && rutaEstaciones.length > 0 && (
        <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display font-bold text-xl mb-1">Estaciones del recorrido</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Posición aproximada de cada bus a lo largo del corredor usando la última lectura disponible.
          </p>
          <div className="relative">
            <div className="absolute left-0 right-0 top-1/2 h-1 gradient-route rounded-full -translate-y-1/2" />
            <ol className="relative grid gap-y-6" style={{ gridTemplateColumns: `repeat(${rutaEstaciones.length}, minmax(0, 1fr))` }}>
              {rutaEstaciones.map((station) => {
                const here = busesFiltradosPorRuta.filter((bus) => bus.estacionActualId === station.id).length;
                return (
                  <li key={station.id} className="flex flex-col items-center text-center relative">
                    <div className={`w-4 h-4 rounded-full border-2 border-background z-10 ${here ? "bg-primary shadow-glow" : "bg-muted-foreground/40"}`} />
                    {here > 0 && (
                      <span className="absolute -top-6 text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                        {here}
                      </span>
                    )}
                    <span className="text-[10px] mt-2 max-w-[60px] truncate text-muted-foreground" title={station.nombre}>
                      {station.nombre}
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
