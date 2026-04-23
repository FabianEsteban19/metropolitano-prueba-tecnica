import type { BusLiveView, Estacion } from "@/lib/api/types";
import { Users, Gauge, MapPin, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

interface Props {
  bus: BusLiveView;
  estaciones: Estacion[];
}

const statusMap: Record<BusLiveView["estado"], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  en_ruta: { label: "En ruta", cls: "bg-success/15 text-success border-success/30", Icon: ArrowRight },
  en_estacion: { label: "En estación", cls: "bg-primary/15 text-primary border-primary/30", Icon: CheckCircle2 },
  retraso: { label: "Con retraso", cls: "bg-warning/15 text-warning border-warning/40", Icon: AlertCircle },
  fuera_servicio: { label: "Fuera de servicio", cls: "bg-muted text-muted-foreground border-border", Icon: AlertCircle },
};

export const BusCard = ({ bus, estaciones }: Props) => {
  const current = estaciones.find((s) => s.id === bus.estacion_actual_id);
  const next = estaciones.find((s) => s.id === bus.estacion_siguiente_id);
  const occupancyPct = Math.round((bus.ocupacion_actual / bus.capacidad) * 100);
  const occColor = occupancyPct >= 85 ? "bg-destructive" : occupancyPct >= 60 ? "bg-warning" : "bg-success";
  const status = statusMap[bus.estado];

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elegant transition-smooth fade-in-up">
      <header className="flex items-start justify-between mb-4">
        <div>
          <div className="font-mono text-xs text-muted-foreground">#{bus.placa ?? "—"}</div>
          <div className="font-display font-bold text-lg">{bus.codigo}</div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${status.cls}`}>
          <status.Icon className="w-3 h-3" />
          {status.label}
        </span>
      </header>

      <div className="relative mb-5">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium truncate max-w-[45%]" title={current?.nombre}>
            <MapPin className="w-3 h-3 inline -mt-0.5 text-primary" /> {current?.nombre ?? "—"}
          </span>
          <span className="font-medium truncate max-w-[45%] text-right text-muted-foreground" title={next?.nombre}>
            {next?.nombre ?? "Final"} <ArrowRight className="w-3 h-3 inline -mt-0.5" />
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 gradient-route rounded-full transition-all duration-500"
            style={{ width: `${bus.progreso * 100}%` }}
          />
          <div
            className="absolute -top-1 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-md bus-move"
            style={{ left: `calc(${bus.progreso * 100}% - 8px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
          <span>{Math.round(bus.progreso * 100)}%</span>
          <span>ETA {bus.eta_minutos} min</span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="flex items-center gap-1.5 font-medium"><Users className="w-3.5 h-3.5" /> Aforo</span>
          <span className="font-mono">
            {bus.ocupacion_actual}<span className="text-muted-foreground">/{bus.capacidad}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${occColor} transition-all duration-500`} style={{ width: `${occupancyPct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
        <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> {Math.round(bus.velocidad_kmh)} km/h</span>
        <span className="capitalize">→ {bus.direccion}</span>
      </div>
    </article>
  );
};
