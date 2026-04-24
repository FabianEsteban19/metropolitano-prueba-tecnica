import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { listarBuses, listarEstaciones, listarRutas, obtenerHistorial } from "@/lib/api/metropolitanoApi";
import type { Bus, Estacion, Reporte, Ruta } from "@/lib/api/types";
import { useStoreVersion } from "@/lib/hooks/useStoreVersion";
import { FleetMap } from "@/components/admin/FleetMap";
import { Users, Gauge, MapPin, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const HistorialPage = () => {
  const v = useStoreVersion();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [busId, setBusId] = useState<string>("");
  const [historial, setHistorial] = useState<Reporte[]>([]);

  useEffect(() => {
    listarBuses({ page: 1, page_size: 1000 }).then((r) => {
      if (r.ok && r.data) {
        setBuses(r.data.items);
        if (!busId && r.data.items.length) setBusId(String(r.data.items[0].id));
      }
    });
    listarRutas().then(setRutas);
    listarEstaciones().then(setEstaciones);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  useEffect(() => {
    if (!busId) return;
    obtenerHistorial(busId as unknown as number, { limit: 100 }).then((r) => r.ok && r.data && setHistorial(r.data));
  }, [busId, v]);

  const bus = buses.find((b) => String(b.id) === String(busId));
  const ruta = rutas.find((r) => String(r.id) === String(bus?.ruta_id));

  const chartData = useMemo(() => {
    return [...historial].reverse().map((r) => ({
      time: new Date(r.timestamp).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      pasajeros: r.cantidad_pasajeros,
      ocupacion: r.ocupacion_pct ?? 0,
      velocidad: r.velocidad_kmh ?? 0,
    }));
  }, [historial]);

  const stats = useMemo(() => {
    if (!historial.length) return null;
    const promPas = Math.round(historial.reduce((a, r) => a + r.cantidad_pasajeros, 0) / historial.length);
    const promOcc = Math.round(historial.reduce((a, r) => a + (r.ocupacion_pct ?? 0), 0) / historial.length);
    const maxOcc = Math.max(...historial.map((r) => r.ocupacion_pct ?? 0));
    const promVel = Math.round(historial.reduce((a, r) => a + (r.velocidad_kmh ?? 0), 0) / historial.length);
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
            Fuente: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">GET /reportes</code>
          </p>
        </div>
        <Select value={busId} onValueChange={setBusId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Selecciona un bus" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {buses.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                #{b.id} · {b.codigo} · {b.placa ?? "s/placa"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {bus && (
        <>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-wrap gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Bus</div>
              <div className="font-display font-bold text-xl">{bus.codigo}</div>
              <div className="text-xs text-muted-foreground">Placa {bus.placa ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Ruta</div>
              <div className="font-display font-semibold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: ruta?.color }} />
                {ruta?.nombre ?? "—"}
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

          <div className="space-y-2">
            <h3 className="font-display font-semibold">Última posición conocida</h3>
            <FleetMap
              buses={[bus]} estaciones={estaciones}
              reportesByBus={reportesByBus}
              height="420px" selectedBusId={bus.id}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display font-semibold">Reportes cronológicos</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estación</TableHead>
                    <TableHead className="text-right">Pasajeros</TableHead>
                    <TableHead className="text-right">Ocupación</TableHead>
                    <TableHead className="text-right">Vel.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.map((r) => {
                    const est = estaciones.find((s) => s.id === r.estacion_id);
                    const pct = r.ocupacion_pct ?? 0;
                    const pctColor = pct >= 85 ? "text-destructive" : pct >= 60 ? "text-warning" : "text-success";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">#{r.id}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.timestamp).toLocaleString("es-PE")}
                        </TableCell>
                        <TableCell className="text-xs">{est?.nombre ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono">{r.cantidad_pasajeros}/{bus.capacidad}</TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${pctColor}`}>{pct}%</TableCell>
                        <TableCell className="text-right font-mono text-xs">{r.velocidad_kmh ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HistorialPage;
