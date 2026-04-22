import type { Bus, Station } from "@/lib/api/types";
import { Users, Gauge, MapPin, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

interface Props {
  bus: Bus;
  stations: Station[];
}

const statusMap: Record<Bus["status"], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  en_ruta: { label: "En ruta", cls: "bg-success/15 text-success border-success/30", Icon: ArrowRight },
  en_estacion: { label: "En estación", cls: "bg-primary/15 text-primary border-primary/30", Icon: CheckCircle2 },
  retraso: { label: "Con retraso", cls: "bg-warning/15 text-warning border-warning/40", Icon: AlertCircle },
  fuera_servicio: { label: "Fuera de servicio", cls: "bg-muted text-muted-foreground border-border", Icon: AlertCircle },
};

export const BusCard = ({ bus, stations }: Props) => {
  const current = stations.find((s) => s.id === bus.currentStationId);
  const next = stations.find((s) => s.id === bus.nextStationId);
  const occupancyPct = Math.round((bus.currentOccupancy / bus.capacity) * 100);
  const occColor =
    occupancyPct >= 85 ? "bg-destructive" : occupancyPct >= 60 ? "bg-warning" : "bg-success";
  const status = statusMap[bus.status];

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elegant transition-smooth fade-in-up">
      <header className="flex items-start justify-between mb-4">
        <div>
          <div className="font-mono text-xs text-muted-foreground">#{bus.plate}</div>
          <div className="font-display font-bold text-lg">{bus.id}</div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${status.cls}`}>
          <status.Icon className="w-3 h-3" />
          {status.label}
        </span>
      </header>

      {/* Tracker visual */}
      <div className="relative mb-5">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium truncate max-w-[45%]" title={current?.name}>
            <MapPin className="w-3 h-3 inline -mt-0.5 text-primary" /> {current?.name ?? "—"}
          </span>
          <span className="font-medium truncate max-w-[45%] text-right text-muted-foreground" title={next?.name}>
            {next?.name ?? "Final"} <ArrowRight className="w-3 h-3 inline -mt-0.5" />
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 gradient-route rounded-full transition-all duration-500"
            style={{ width: `${bus.progress * 100}%` }}
          />
          <div
            className="absolute -top-1 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-md bus-move"
            style={{ left: `calc(${bus.progress * 100}% - 8px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
          <span>{Math.round(bus.progress * 100)}%</span>
          <span>ETA {bus.etaMinutes} min</span>
        </div>
      </div>

      {/* Aforo */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="flex items-center gap-1.5 font-medium"><Users className="w-3.5 h-3.5" /> Aforo</span>
          <span className="font-mono">
            {bus.currentOccupancy}<span className="text-muted-foreground">/{bus.capacity}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${occColor} transition-all duration-500`} style={{ width: `${occupancyPct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
        <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> {Math.round(bus.speed)} km/h</span>
        <span className="capitalize">→ {bus.direction}</span>
      </div>
    </article>
  );
};
