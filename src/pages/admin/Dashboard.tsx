import { useEffect, useMemo, useState } from "react";
import { Activity, Bus as BusIcon, AlertTriangle, Users, MapPin, Gauge, Play, Square } from "lucide-react";
import {
  getStations, listarBuses, listarReportes, isSimulating,
  startSimulation, stopSimulation, getRoutes,
} from "@/lib/api/metropolitanoApi";
import type { Bus, Reporte, Route, Station } from "@/lib/api/types";
import { useStoreVersion } from "@/lib/hooks/useStoreVersion";
import { FleetMap } from "@/components/admin/FleetMap";

const Dashboard = () => {
  const v = useStoreVersion();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [simOn, setSimOn] = useState(isSimulating());

  useEffect(() => {
    Promise.all([listarBuses(), listarReportes(300), getStations(), getRoutes()]).then(
      ([b, r, s, ro]) => {
        if (b.ok && b.data) setBuses(b.data);
        if (r.ok && r.data) setReportes(r.data);
        setStations(s);
        setRoutes(ro);
      }
    );
    setSimOn(isSimulating());
  }, [v]);

  const reportesByBus = useMemo(() => {
    const map: Record<string, Reporte[]> = {};
    reportes.forEach((r) => {
      (map[r.busId] ??= []).push(r);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)));
    return map;
  }, [reportes]);

  const stats = useMemo(() => {
    const total = buses.length;
    let activos = 0, llenos = 0, sumPct = 0, conReporte = 0, totalPasajeros = 0;
    buses.forEach((b) => {
      const last = reportesByBus[b.id]?.[0];
      if (last) {
        conReporte++;
        const pct = (last.cantidadPasajeros / b.capacidad) * 100;
        sumPct += pct;
        if (pct >= 85) llenos++;
        totalPasajeros += last.cantidadPasajeros;
        const minsAgo = (Date.now() - +new Date(last.timestamp)) / 60000;
        if (minsAgo < 10) activos++;
      }
    });
    return {
      total,
      activos,
      llenos,
      ocupacionMedia: conReporte ? Math.round(sumPct / conReporte) : 0,
      totalPasajeros,
    };
  }, [buses, reportesByBus]);

  const toggleSim = () => {
    if (simOn) { stopSimulation(); setSimOn(false); }
    else { startSimulation(3000); setSimOn(true); }
  };

  const ultimosReportes = reportes.slice(0, 8);

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Estado actual de la flota y monitoreo en vivo del corredor.
          </p>
        </div>
        <button
          onClick={toggleSim}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-smooth shadow-card ${
            simOn
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-primary text-primary-foreground hover:bg-primary-glow"
          }`}
        >
          {simOn ? <><Square className="w-4 h-4" /> Detener simulación</> : <><Play className="w-4 h-4" /> Iniciar simulación</>}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Buses totales", value: stats.total, icon: BusIcon, color: "text-foreground" },
          { label: "Activos (10 min)", value: stats.activos, icon: Activity, color: "text-success" },
          { label: "Llenos (≥85%)", value: stats.llenos, icon: AlertTriangle, color: "text-destructive" },
          { label: "Ocupación media", value: `${stats.ocupacionMedia}%`, icon: Gauge, color: "text-primary" },
          { label: "Pasajeros (último)", value: stats.totalPasajeros, icon: Users, color: "text-accent-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mapa + actividad */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Mapa en vivo
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-success" /> Bajo</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> Medio</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /> Alto</span>
            </div>
          </div>
          <FleetMap
            buses={buses} stations={stations} reportesByBus={reportesByBus}
            selectedBusId={selectedBusId} onSelectBus={setSelectedBusId} height="600px"
          />
        </div>

        {/* Actividad reciente */}
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Actividad reciente
            </h2>
          </div>
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {ultimosReportes.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">
                Sin reportes aún. Activa la simulación o registra uno manual.
              </div>
            )}
            {ultimosReportes.map((r) => {
              const bus = buses.find((b) => b.id === r.busId);
              const station = stations.find((s) => s.id === r.estacionId);
              const route = routes.find((rt) => rt.id === bus?.routeId);
              const pct = r.ocupacionPct ?? 0;
              const pctColor = pct >= 85 ? "text-destructive" : pct >= 60 ? "text-warning" : "text-success";
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedBusId(r.busId)}
                  className="w-full text-left p-4 hover:bg-muted/50 transition-smooth"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-sm">{bus?.codigo ?? r.busId}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {route?.name} · {station?.name ?? "—"}
                      </div>
                    </div>
                    <div className={`font-display font-bold ${pctColor}`}>
                      {pct}%
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
                    <span>{r.cantidadPasajeros}/{bus?.capacidad ?? "?"} pas.</span>
                    <span>{new Date(r.timestamp).toLocaleTimeString("es-PE")}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
