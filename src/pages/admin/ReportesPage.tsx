import { useEffect, useMemo, useState } from "react";
import { listarBuses, listarReportes, getStations, getRoutes } from "@/lib/api/metropolitanoApi";
import type { Bus, Reporte, Route, Station } from "@/lib/api/types";
import { useStoreVersion } from "@/lib/hooks/useStoreVersion";
import { Search } from "lucide-react";

const ReportesPage = () => {
  const v = useStoreVersion();
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [busFilter, setBusFilter] = useState("todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    listarReportes(500).then((r) => r.ok && r.data && setReportes(r.data));
    listarBuses().then((r) => r.ok && r.data && setBuses(r.data));
    getStations().then(setStations);
    getRoutes().then(setRoutes);
  }, [v]);

  const filtered = useMemo(() => {
    return reportes.filter((r) => {
      if (busFilter !== "todos" && r.busId !== busFilter) return false;
      if (search) {
        const bus = buses.find((b) => b.id === r.busId);
        const txt = (bus?.codigo + " " + bus?.plate).toLowerCase();
        if (!txt.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [reportes, busFilter, search, buses]);

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div>
        <h1 className="font-display font-bold text-3xl tracking-tight">Reportes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Listado global de reportes registrados (últimos 500). Endpoint: <code className="font-mono text-xs">GET /reportes</code>
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por bus…"
            maxLength={50}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={busFilter} onChange={(e) => setBusFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option value="todos">Todos los buses</option>
          {buses.map((b) => <option key={b.id} value={b.id}>{b.codigo}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
              <tr>
                <th className="text-left px-4 py-3">Fecha / hora</th>
                <th className="text-left px-4 py-3">Bus</th>
                <th className="text-left px-4 py-3">Ruta</th>
                <th className="text-left px-4 py-3">Estación</th>
                <th className="text-right px-4 py-3">Pasajeros</th>
                <th className="text-right px-4 py-3">Ocupación</th>
                <th className="text-right px-4 py-3">Vel.</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">Coords</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Sin reportes.</td></tr>
              )}
              {filtered.map((r) => {
                const bus = buses.find((b) => b.id === r.busId);
                const station = stations.find((s) => s.id === r.estacionId);
                const route = routes.find((rt) => rt.id === bus?.routeId);
                const pct = r.ocupacionPct ?? 0;
                const pctColor = pct >= 85 ? "text-destructive" : pct >= 60 ? "text-warning" : "text-success";
                return (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.timestamp).toLocaleString("es-PE")}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">{bus?.codigo ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{route?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{station?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{r.cantidadPasajeros}/{bus?.capacidad ?? "?"}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${pctColor}`}>{pct}%</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{r.velocidadKmh ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-[10px] text-muted-foreground hidden md:table-cell">
                      {r.latitud.toFixed(4)}, {r.longitud.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportesPage;
