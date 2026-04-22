import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { getStations, listarBuses, obtenerHistorial, getRoutes } from "@/lib/api/metropolitanoApi";
import type { Bus, Reporte, Route, Station } from "@/lib/api/types";
import { useStoreVersion } from "@/lib/hooks/useStoreVersion";
import { FleetMap } from "@/components/admin/FleetMap";
import { Users, Gauge, MapPin, Activity } from "lucide-react";

const HistorialPage = () => {
  const v = useStoreVersion();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [busId, setBusId] = useState<string>("");
  const [historial, setHistorial] = useState<Reporte[]>([]);

  useEffect(() => {
    listarBuses().then((r) => {
      if (r.ok && r.data) {
        setBuses(r.data);
        if (!busId && r.data.length) setBusId(r.data[0].id);
      }
    });
    getRoutes().then(setRoutes);
    getStations().then(setStations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  useEffect(() => {
    if (!busId) return;
    obtenerHistorial(busId, { limit: 100 }).then((r) => r.ok && r.data && setHistorial(r.data));
  }, [busId, v]);

  const bus = buses.find((b) => b.id === busId);
  const route = routes.find((r) => r.id === bus?.routeId);

  const chartData = useMemo(() => {
    return [...historial].reverse().map((r) => ({
      time: new Date(r.timestamp).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      pasajeros: r.cantidadPasajeros,
      ocupacion: r.ocupacionPct ?? 0,
      velocidad: r.velocidadKmh ?? 0,
    }));
  }, [historial]);

  const stats = useMemo(() => {
    if (!historial.length) return null;
    const promPas = Math.round(historial.reduce((a, r) => a + r.cantidadPasajeros, 0) / historial.length);
    const promOcc = Math.round(historial.reduce((a, r) => a + (r.ocupacionPct ?? 0), 0) / historial.length);
    const maxOcc = Math.max(...historial.map((r) => r.ocupacionPct ?? 0));
    const promVel = Math.round(historial.reduce((a, r) => a + (r.velocidadKmh ?? 0), 0) / historial.length);
    return { promPas, promOcc, maxOcc, promVel };
  }, [historial]);

  const reportesByBus = useMemo(() => {
    if (!bus) return {};
    return { [bus.id]: historial };
  }, [bus, historial]);

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Historial por bus</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Endpoint: <code className="font-mono text-xs">GET /buses/:id/historial</code>
          </p>
        </div>
        <select value={busId} onChange={(e) => setBusId(e.target.value)}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium min-w-[260px]">
          {buses.map((b) => (
            <option key={b.id} value={b.id}>{b.codigo} · {b.plate}</option>
          ))}
        </select>
      </div>

      {bus && (
        <>
          {/* header bus */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-wrap gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Bus</div>
              <div className="font-display font-bold text-xl">{bus.codigo}</div>
              <div className="text-xs text-muted-foreground">Placa {bus.plate}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Ruta</div>
              <div className="font-display font-semibold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: route?.color }} />
                {route?.name ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Capacidad</div>
              <div className="font-mono font-semibold">{bus.capacidad}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Reportes</div>
              <div className="font-mono font-semibold">{historial.length}</div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Pasajeros prom.", value: stats.promPas, icon: Users },
                { label: "Ocupación prom.", value: `${stats.promOcc}%`, icon: Gauge },
                { label: "Pico ocupación", value: `${stats.maxOcc}%`, icon: Activity },
                { label: "Velocidad prom.", value: `${stats.promVel} km/h`, icon: MapPin },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <s.icon className="w-4 h-4 text-muted-foreground mb-2" />
                  <div className="font-display font-bold text-2xl">{s.value}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* gráfico */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-display font-semibold mb-4">Evolución de ocupación</h3>
            {chartData.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Sin datos.</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <ReferenceLine y={85} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Lleno", fill: "hsl(var(--destructive))", fontSize: 10 }} />
                    <Line type="monotone" dataKey="ocupacion" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* mapa con trayectoria de este bus */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold">Última posición</h3>
            <FleetMap
              buses={[bus]} stations={stations}
              reportesByBus={reportesByBus}
              height="420px" selectedBusId={bus.id}
            />
          </div>

          {/* tabla cronológica */}
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display font-semibold">Reportes cronológicos</h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2">Fecha</th>
                    <th className="text-left px-4 py-2">Estación</th>
                    <th className="text-right px-4 py-2">Pasajeros</th>
                    <th className="text-right px-4 py-2">Ocupación</th>
                    <th className="text-right px-4 py-2">Vel.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historial.map((r) => {
                    const station = stations.find((s) => s.id === r.estacionId);
                    const pct = r.ocupacionPct ?? 0;
                    const pctColor = pct >= 85 ? "text-destructive" : pct >= 60 ? "text-warning" : "text-success";
                    return (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.timestamp).toLocaleString("es-PE")}
                        </td>
                        <td className="px-4 py-2 text-xs">{station?.name ?? "—"}</td>
                        <td className="px-4 py-2 text-right font-mono">{r.cantidadPasajeros}/{bus.capacidad}</td>
                        <td className={`px-4 py-2 text-right font-mono font-semibold ${pctColor}`}>{pct}%</td>
                        <td className="px-4 py-2 text-right font-mono text-xs">{r.velocidadKmh ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HistorialPage;
