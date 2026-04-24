import { useMemo } from "react";
import { Clock, MapPin } from "lucide-react";

import type { PublicRuta, PublicRutaEstacion, PublicEstacion } from "@/features/public-transit/types";

interface Props {
  routeId: string | null;
  rutas: PublicRuta[];
  estacionesById: Map<string, PublicEstacion>;
  routeStationsByRouteId: Record<string, PublicRutaEstacion[]>;
}

export const ScheduleSection = ({ routeId, rutas, estacionesById, routeStationsByRouteId }: Props) => {
  const ruta = useMemo(() => rutas.find((item) => item.id === routeId) ?? null, [rutas, routeId]);
  const rutaEstaciones = useMemo(
    () =>
      routeId
        ? (routeStationsByRouteId[routeId] ?? [])
            .map((row) => ({
              ...row,
              estacion: estacionesById.get(row.estacionId),
            }))
            .filter((row): row is PublicRutaEstacion & { estacion: PublicEstacion } => Boolean(row.estacion))
        : [],
    [routeId, routeStationsByRouteId, estacionesById],
  );

  if (!ruta) {
    return (
      <section id="horarios" className="container py-20">
        <p className="text-muted-foreground">Selecciona una ruta para ver su frecuencia y recorrido.</p>
      </section>
    );
  }

  return (
    <section id="horarios" className="bg-secondary text-secondary-foreground py-20">
      <div className="container">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">02 · Operación</div>
            <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight">
              {ruta.nombre}
            </h2>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-70">Servicio:</span>
            <span className="rounded-lg border border-background/20 bg-background/10 px-3 py-2">
              {ruta.servicio.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-background/5 border border-background/10 p-6">
            <h3 className="font-display font-semibold mb-4 text-accent">Resumen operativo</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Frecuencia</span>
                <span className="font-mono">cada {ruta.frecuenciaMin} min</span>
              </li>
              <li className="flex justify-between">
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Estaciones</span>
                <span className="font-mono">{rutaEstaciones.length}</span>
              </li>
              <li className="border-t border-background/10 pt-3 mt-3 text-xs opacity-80">
                La landing pública usa datos reales de rutas, estaciones y recorrido. Los horarios exactos por estación
                quedarán listos cuando exista un endpoint público dedicado.
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2 rounded-2xl bg-background/5 border border-background/10 p-6">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2 text-accent">
              <MapPin className="w-4 h-4" /> Recorrido de estaciones
            </h3>
            {rutaEstaciones.length === 0 ? (
              <p className="text-sm opacity-70">No se encontraron estaciones activas para esta ruta.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {rutaEstaciones.map((row) => (
                  <div key={row.estacionId} className="rounded-xl bg-background/10 hover:bg-background/15 transition-smooth p-4">
                    <div className="font-display font-bold text-lg">{String(row.orden).padStart(2, "0")}</div>
                    <div className="text-sm mt-1 truncate" title={row.estacion.nombre}>{row.estacion.nombre}</div>
                    <div className="text-[10px] uppercase tracking-wider mt-1 opacity-80">
                      {row.estacion.distrito}
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
