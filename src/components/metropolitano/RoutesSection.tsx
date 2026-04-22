import { useEffect, useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { getRoutes } from "@/lib/api/metropolitanoApi";
import type { Route } from "@/lib/api/types";

interface Props {
  selectedRouteId: string | null;
  onSelect: (id: string) => void;
}

export const RoutesSection = ({ selectedRouteId, onSelect }: Props) => {
  const [routes, setRoutes] = useState<Route[]>([]);

  useEffect(() => {
    getRoutes().then(setRoutes);
  }, []);

  return (
    <section id="rutas" className="container py-20">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">01 · Rutas</div>
          <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight">
            Servicios del corredor troncal
          </h2>
        </div>
        <p className="text-muted-foreground max-w-md">
          Selecciona una ruta para ver sus estaciones, horarios y los buses operando en este momento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {routes.map((route) => {
          const active = route.id === selectedRouteId;
          return (
            <button
              key={route.id}
              onClick={() => onSelect(route.id)}
              className={`text-left rounded-2xl p-6 border-2 transition-smooth shadow-card hover:shadow-elegant hover:-translate-y-1 ${
                active
                  ? "border-primary bg-card ring-4 ring-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-lg text-primary-foreground shadow-md"
                  style={{ backgroundColor: route.color }}
                >
                  {route.code}
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                  {route.service}
                </span>
              </div>

              <h3 className="font-display font-bold text-xl mb-2">{route.name}</h3>
              <p className="text-sm text-muted-foreground mb-5 line-clamp-2">{route.description}</p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-4">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {route.stationIds.length} estaciones
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  cada {route.frequencyMinutes} min
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
