import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Edit2, X, Bus as BusIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  actualizarBus, crearBus, eliminarBus, getRoutes, listarBuses, registrarReporte, getStations,
} from "@/lib/api/metropolitanoApi";
import type { Bus, Route, Station } from "@/lib/api/types";
import { useStoreVersion } from "@/lib/hooks/useStoreVersion";

type Filter = "todos" | "lleno" | "medio" | "bajo" | "sin_reporte";

const BusesPage = () => {
  const v = useStoreVersion();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [routeFilter, setRouteFilter] = useState<string>("todos");

  const [editing, setEditing] = useState<Bus | null>(null);
  const [creating, setCreating] = useState(false);
  const [reporting, setReporting] = useState<Bus | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    listarBuses().then((r) => r.ok && r.data && setBuses(r.data));
    getRoutes().then(setRoutes);
    getStations().then(setStations);
  }, [v]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    return buses.filter((b) => {
      if (search && !b.codigo.toLowerCase().includes(search.toLowerCase()) && !b.plate.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (routeFilter !== "todos" && b.routeId !== routeFilter) return false;
      const pct = b.ultimoReporte?.ocupacionPct ?? -1;
      if (filter === "sin_reporte" && b.ultimoReporte) return false;
      if (filter === "lleno" && pct < 85) return false;
      if (filter === "medio" && (pct < 60 || pct >= 85)) return false;
      if (filter === "bajo" && (pct < 0 || pct >= 60)) return false;
      return true;
    });
  }, [buses, search, filter, routeFilter]);

  const onDelete = async (b: Bus) => {
    if (!confirm(`¿Eliminar el bus ${b.codigo}? Esto borra también su historial.`)) return;
    const r = await eliminarBus(b.id);
    setToast(r.ok ? { kind: "ok", msg: "Bus eliminado" } : { kind: "err", msg: r.error?.message ?? "Error" });
  };

  return (
    <div className="space-y-6 max-w-[1600px]">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 shadow-elegant text-sm flex items-center gap-2 fade-in-up ${
          toast.kind === "ok" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
        }`}>
          {toast.kind === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Gestión de buses</h1>
          <p className="text-muted-foreground text-sm mt-1">CRUD de la flota y registro de reportes manuales.</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary-glow transition-smooth shadow-elegant">
          <Plus className="w-4 h-4" /> Nuevo bus
        </button>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o placa…"
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={50}
          />
        </div>
        <select value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option value="todos">Todas las rutas</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <div className="flex gap-1">
          {(["todos", "lleno", "medio", "bajo", "sin_reporte"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-smooth ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {f === "todos" ? "Todos" : f === "lleno" ? "Llenos" : f === "medio" ? "Medio" : f === "bajo" ? "Bajos" : "Sin reporte"}
            </button>
          ))}
        </div>
      </div>

      {/* tabla */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Código</th>
                <th className="text-left px-4 py-3">Placa</th>
                <th className="text-left px-4 py-3">Ruta</th>
                <th className="text-right px-4 py-3">Capacidad</th>
                <th className="text-left px-4 py-3">Último reporte</th>
                <th className="text-left px-4 py-3">Ocupación</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <BusIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Sin buses para los filtros actuales.
                </td></tr>
              )}
              {filtered.map((b) => {
                const route = routes.find((r) => r.id === b.routeId);
                const last = b.ultimoReporte;
                const pct = last?.ocupacionPct ?? 0;
                const pctColor = pct >= 85 ? "bg-destructive" : pct >= 60 ? "bg-warning" : "bg-success";
                return (
                  <tr key={b.id} className="hover:bg-muted/30 transition-smooth">
                    <td className="px-4 py-3 font-mono font-semibold">{b.codigo}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.plate}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: route?.color }} />
                        {route?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{b.capacidad}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {last ? new Date(last.timestamp).toLocaleString("es-PE") : <span className="text-warning">Sin reporte</span>}
                    </td>
                    <td className="px-4 py-3 min-w-[160px]">
                      {last ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full ${pctColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-xs w-10 text-right">{pct}%</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setReporting(b)}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-primary" title="Registrar reporte">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditing(b)}
                          className="p-1.5 rounded-md hover:bg-muted" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(b)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* modales */}
      {(creating || editing) && (
        <BusFormModal
          bus={editing}
          routes={routes}
          onClose={() => { setCreating(false); setEditing(null); }}
          onResult={(ok, msg) => setToast({ kind: ok ? "ok" : "err", msg })}
        />
      )}
      {reporting && (
        <ReporteModal
          bus={reporting}
          stations={stations}
          onClose={() => setReporting(null)}
          onResult={(ok, msg) => setToast({ kind: ok ? "ok" : "err", msg })}
        />
      )}
    </div>
  );
};

// ---------- Modal Bus ----------
const BusFormModal = ({ bus, routes, onClose, onResult }: {
  bus: Bus | null; routes: Route[]; onClose: () => void;
  onResult: (ok: boolean, msg: string) => void;
}) => {
  const [codigo, setCodigo] = useState(bus?.codigo ?? "");
  const [plate, setPlate] = useState(bus?.plate ?? "");
  const [capacidad, setCapacidad] = useState<number>(bus?.capacidad ?? 160);
  const [routeId, setRouteId] = useState(bus?.routeId ?? routes[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    const r = bus
      ? await actualizarBus(bus.id, { codigo, plate, capacidad, routeId })
      : await crearBus({ codigo, plate, capacidad, routeId });
    setBusy(false);
    if (!r.ok) { setErr(r.error?.message ?? "Error"); return; }
    onResult(true, bus ? "Bus actualizado" : "Bus creado");
    onClose();
  };

  return (
    <ModalShell title={bus ? "Editar bus" : "Nuevo bus"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Código" hint="Único, ej. METRO-001">
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} required maxLength={30}
            className="modal-input" />
        </Field>
        <Field label="Placa">
          <input value={plate} onChange={(e) => setPlate(e.target.value)} required maxLength={20}
            className="modal-input" />
        </Field>
        <Field label="Capacidad" hint="Pasajeros máximos (1 – 300)">
          <input type="number" min={1} max={300} value={capacidad}
            onChange={(e) => setCapacidad(Number(e.target.value))} required className="modal-input" />
        </Field>
        <Field label="Ruta asignada">
          <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className="modal-input">
            {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        {err && <div className="text-sm text-destructive flex gap-2"><AlertCircle className="w-4 h-4" />{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancelar</button>
          <button disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-glow disabled:opacity-50">
            {bus ? "Guardar cambios" : "Crear bus"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// ---------- Modal Reporte ----------
const ReporteModal = ({ bus, stations, onClose, onResult }: {
  bus: Bus; stations: Station[]; onClose: () => void;
  onResult: (ok: boolean, msg: string) => void;
}) => {
  const [stationId, setStationId] = useState(stations[0]?.id ?? "");
  const [pasajeros, setPasajeros] = useState<number>(Math.floor(bus.capacidad * 0.4));
  const [velocidad, setVelocidad] = useState<number>(25);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    const station = stations.find((s) => s.id === stationId);
    if (!station) { setErr("Estación inválida"); setBusy(false); return; }
    const r = await registrarReporte({
      busId: bus.id, latitud: station.lat, longitud: station.lng,
      cantidadPasajeros: pasajeros, velocidadKmh: velocidad,
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error?.message ?? "Error"); return; }
    onResult(true, "Reporte registrado");
    onClose();
  };

  const pct = Math.round((pasajeros / bus.capacidad) * 100);
  const exceeds = pasajeros > bus.capacidad;

  return (
    <ModalShell title={`Registrar reporte · ${bus.codigo}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Estación / Ubicación">
          <select value={stationId} onChange={(e) => setStationId(e.target.value)} className="modal-input">
            {stations.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.district}</option>)}
          </select>
        </Field>
        <Field label={`Pasajeros (capacidad: ${bus.capacidad})`}>
          <input type="number" min={0} value={pasajeros}
            onChange={(e) => setPasajeros(Number(e.target.value))} required className="modal-input" />
        </Field>
        <Field label="Velocidad (km/h)">
          <input type="number" min={0} max={120} value={velocidad}
            onChange={(e) => setVelocidad(Number(e.target.value))} required className="modal-input" />
        </Field>
        <div className={`rounded-lg p-3 text-sm ${exceeds ? "bg-destructive/10 text-destructive border border-destructive/30" : "bg-muted"}`}>
          Ocupación: <strong>{pct}%</strong> {exceeds && "— ¡excede capacidad!"}
        </div>
        {err && <div className="text-sm text-destructive flex gap-2"><AlertCircle className="w-4 h-4" />{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancelar</button>
          <button disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-glow disabled:opacity-50">
            Registrar
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// ---------- Helpers ----------
const ModalShell = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 fade-in-up">
    <div className="bg-card border border-border rounded-2xl shadow-elegant w-full max-w-md">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-display font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
    <style>{`.modal-input { width:100%; padding:0.5rem 0.75rem; border:1px solid hsl(var(--border)); border-radius:0.5rem; background:hsl(var(--background)); font-size:0.875rem; }
    .modal-input:focus { outline:none; box-shadow:0 0 0 2px hsl(var(--primary)); }`}</style>
  </div>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-sm font-medium mb-1">{label}</div>
    {children}
    {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
  </label>
);

export default BusesPage;
