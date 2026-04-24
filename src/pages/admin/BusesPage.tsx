import { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, Trash2, Edit2, Bus as BusIcon, AlertCircle, CheckCircle2,
  Power, PowerOff, ChevronLeft, ChevronRight, Filter as FilterIcon,
} from "lucide-react";
import {
  actualizarBus, cambiarEstadoBus, crearBus, eliminarBus, listarBuses,
  listarEstaciones, listarRutas, registrarReporte,
  type BusFilter, type ListarBusesParams,
} from "@/lib/api/metropolitanoApi";
import {
  BUS_ESTADOS, type Bus, type BusEstado, type Estacion, type Ruta,
} from "@/lib/api/types";
import { useStoreVersion } from "@/lib/hooks/useStoreVersion";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 8;

const ESTADO_LABEL: Record<BusEstado, string> = {
  en_ruta: "En ruta",
  en_estacion: "En estación",
  fuera_servicio: "Fuera de servicio",
  retraso: "Con retraso",
};
const ESTADO_VARIANT: Record<BusEstado, "default" | "secondary" | "destructive" | "outline"> = {
  en_ruta: "default",
  en_estacion: "secondary",
  fuera_servicio: "outline",
  retraso: "destructive",
};

const BUS_CODE_PREFIX = "METRO-";

function parseBusCode(codigo: string): { correlativo: number; width: number } | null {
  const match = codigo.trim().toUpperCase().match(/^METRO-(\d+)$/);
  if (!match) return null;

  const correlativo = Number(match[1]);
  if (!Number.isFinite(correlativo)) return null;

  return {
    correlativo,
    width: Math.max(3, match[1].length),
  };
}

function getNextBusCode(items: Array<Pick<Bus, "codigo">>): string {
  let maxCorrelativo = 0;
  let width = 3;

  items.forEach((item) => {
    const parsed = parseBusCode(item.codigo);
    if (!parsed) return;

    maxCorrelativo = Math.max(maxCorrelativo, parsed.correlativo);
    width = Math.max(width, parsed.width);
  });

  return `${BUS_CODE_PREFIX}${String(maxCorrelativo + 1).padStart(width, "0")}`;
}

const BusesPage = () => {
  const v = useStoreVersion();
  const { toast } = useToast();

  const [buses, setBuses] = useState<Bus[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);

  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<BusFilter>("todos");
  const [rutaFilter, setRutaFilter] = useState<string>("todos");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");

  const [editing, setEditing] = useState<Bus | null>(null);
  const [creating, setCreating] = useState(false);
  const [reporting, setReporting] = useState<Bus | null>(null);
  const [deleting, setDeleting] = useState<Bus | null>(null);

  useEffect(() => {
    listarRutas().then(setRutas);
    listarEstaciones().then(setEstaciones);
  }, [v]);

  useEffect(() => {
    const params: ListarBusesParams = {
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      ruta_id: rutaFilter !== "todos" ? (rutaFilter as unknown as number) : null,
      estado: estadoFilter !== "todos" ? estadoFilter : null,
      filtro,
    };
    listarBuses(params).then((r) => {
      if (r.ok && r.data) {
        setBuses(r.data.items);
        setTotal(r.data.total);
      }
    });
  }, [v, refreshKey, page, search, rutaFilter, estadoFilter, filtro]);

  const refreshList = () => {
    setRefreshKey((current) => current + 1);
  };

  // reset page on filter change
  useEffect(() => { setPage(1); }, [search, rutaFilter, estadoFilter, filtro]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onConfirmDelete = async () => {
    if (!deleting) return;
    const r = await eliminarBus(deleting.id);
    setDeleting(null);
    if (r.ok) {
      refreshList();
      toast({ title: "Bus eliminado", description: `${deleting.codigo} fue eliminado correctamente.` });
    }
    else toast({ title: "Error", description: r.error?.message, variant: "destructive" });
  };

  const toggleEstado = async (bus: Bus) => {
    const nuevo: BusEstado = bus.estado === "fuera_servicio" ? "en_ruta" : "fuera_servicio";
    const r = await cambiarEstadoBus(bus.id, nuevo);
    if (r.ok) {
      refreshList();
      toast({
      title: nuevo === "fuera_servicio" ? "Bus deshabilitado" : "Bus habilitado",
      description: `${bus.codigo} ahora está en estado «${ESTADO_LABEL[nuevo]}».`,
      });
    }
    else toast({ title: "Error", description: r.error?.message, variant: "destructive" });
  };

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Gestión de buses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            CRUD de la flota · Endpoint: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/buses</code>
          </p>
        </div>
        <Button onClick={() => setCreating(true)} size="lg" className="shadow-elegant">
          <Plus className="w-4 h-4" /> Nuevo bus
        </Button>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap gap-3 items-center bg-card border border-border rounded-xl p-3 shadow-card">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o placa…" maxLength={50}
            className="pl-9"
          />
        </div>

        <Select value={rutaFilter} onValueChange={setRutaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ruta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las rutas</SelectItem>
            {rutas.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {BUS_ESTADOS.map((e) => <SelectItem key={e} value={e}>{ESTADO_LABEL[e]}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex gap-1 ml-auto">
          <FilterIcon className="w-4 h-4 self-center text-muted-foreground mr-1" />
          {(["todos", "lleno", "medio", "bajo", "sin_reporte"] as BusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-smooth ${
                filtro === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {f === "todos" ? "Todos"
                : f === "lleno" ? "Llenos"
                : f === "medio" ? "Medio"
                : f === "bajo" ? "Bajos"
                : "Sin reporte"}
            </button>
          ))}
        </div>
      </div>

      {/* tabla */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Ruta</TableHead>
              <TableHead className="text-right">Capacidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último reporte</TableHead>
              <TableHead>Ocupación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buses.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                  <BusIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Sin buses para los filtros actuales.
                </TableCell>
              </TableRow>
            )}
            {buses.map((b) => {
              const ruta = rutas.find((r) => r.id === b.ruta_id);
              const last = b.ultimo_reporte;
              const pct = last?.ocupacion_pct ?? 0;
              const pctColor = pct >= 85 ? "bg-destructive" : pct >= 60 ? "bg-warning" : "bg-success";
              const disabled = b.estado === "fuera_servicio";
              return (
                <TableRow key={b.id} className={disabled ? "opacity-60" : undefined}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{b.id}</TableCell>
                  <TableCell className="font-mono font-semibold">{b.codigo}</TableCell>
                  <TableCell className="text-muted-foreground">{b.placa ?? "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: ruta?.color }} />
                      {ruta?.nombre ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{b.capacidad}</TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[b.estado]}>{ESTADO_LABEL[b.estado]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {last ? new Date(last.timestamp).toLocaleString("es-PE") : <span className="text-warning">Sin reporte</span>}
                  </TableCell>
                  <TableCell className="min-w-[160px]">
                    {last ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${pctColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-xs w-10 text-right">{pct}%</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setReporting(b)} title="Registrar reporte">
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(b)} title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        onClick={() => toggleEstado(b)}
                        title={disabled ? "Habilitar" : "Deshabilitar"}
                        className={disabled ? "text-success" : "text-warning"}
                      >
                        {disabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        onClick={() => setDeleting(b)} title="Eliminar"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* paginación */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <div className="text-muted-foreground">
            Mostrando <strong className="text-foreground">{buses.length}</strong> de{" "}
            <strong className="text-foreground">{total}</strong> buses
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <span className="font-mono text-xs px-3 py-1.5 bg-muted rounded">
              Página {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modales */}
      <BusFormDialog
        open={creating || !!editing}
        bus={editing}
        rutas={rutas}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        onSuccess={(msg) => {
          setPage(1);
          refreshList();
          toast({ title: "Listo", description: msg });
        }}
        onError={(msg) => toast({ title: "Error", description: msg, variant: "destructive" })}
      />

      <ReporteDialog
        bus={reporting}
        estaciones={estaciones}
        onOpenChange={(o) => { if (!o) setReporting(null); }}
        onSuccess={(msg) => {
          refreshList();
          toast({ title: "Reporte registrado", description: msg });
        }}
        onError={(msg) => toast({ title: "Error", description: msg, variant: "destructive" })}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar bus {deleting?.codigo}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. También se eliminará todo el historial de reportes asociado a este bus.
              Si solo deseas inhabilitarlo temporalmente, usa el botón <strong>Deshabilitar</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ---------- Modal Bus (crear / editar) ----------
const BusFormDialog = ({
  open, bus, rutas, onOpenChange, onSuccess, onError,
}: {
  open: boolean;
  bus: Bus | null;
  rutas: Ruta[];
  onOpenChange: (o: boolean) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) => {
  const [codigo, setCodigo] = useState("");
  const [placa, setPlaca] = useState("");
  const [capacidad, setCapacidad] = useState<number>(160);
  const [rutaId, setRutaId] = useState<string>("");
  const [estado, setEstado] = useState<BusEstado>("fuera_servicio");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const hydrateForm = async () => {
      if (!open) return;

      setPlaca(bus?.placa ?? "");
      setCapacidad(bus?.capacidad ?? 160);
      setRutaId(bus?.ruta_id ? String(bus.ruta_id) : (rutas[0] ? String(rutas[0].id) : ""));
      setEstado(bus?.estado ?? "fuera_servicio");
      setErr(null);

      if (bus) {
        setCodigo(bus.codigo);
        return;
      }

      setCodigo(getNextBusCode([]));

      const response = await listarBuses({ page: 1, page_size: 1000 });
      if (!active) return;

      if (response.ok && response.data) {
        setCodigo(getNextBusCode(response.data.items));
      }
    };

    void hydrateForm();

    return () => {
      active = false;
    };
  }, [open, bus, rutas]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    const dto = {
      codigo, capacidad,
      placa: placa.trim() || null,
      ruta_id: rutaId ? (rutaId as unknown as number) : null,
      estado,
    };
    const r = bus
      ? await actualizarBus(bus.id, dto)
      : await crearBus(dto);
    setBusy(false);
    if (!r.ok) { setErr(r.error?.message ?? "Error"); onError(r.error?.message ?? "Error"); return; }
    onSuccess(bus ? `${codigo} actualizado` : `${codigo} creado`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bus ? `Editar bus #${bus.id}` : "Registrar nuevo bus"}</DialogTitle>
          <DialogDescription>
            {bus ? "Modifica los datos del bus." : "Completa los datos para crear un nuevo bus en la flota."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="codigo">Código *</Label>
            <Input
              id="codigo"
              value={codigo}
              readOnly
              disabled
              maxLength={20}
              placeholder="METRO-001"
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Único, ej. METRO-001</p>
          </div>
          <div>
            <Label htmlFor="placa">Placa</Label>
            <Input id="placa" value={placa} onChange={(e) => setPlaca(e.target.value)} maxLength={10}
              placeholder="ABC-123" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="capacidad">Capacidad *</Label>
              <Input id="capacidad" type="number" min={1} max={300} value={capacidad}
                onChange={(e) => setCapacidad(Number(e.target.value))} required />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as BusEstado)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUS_ESTADOS.map((e) => <SelectItem key={e} value={e}>{ESTADO_LABEL[e]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Ruta asignada</Label>
            <Select value={rutaId} onValueChange={setRutaId}>
              <SelectTrigger><SelectValue placeholder="Sin ruta" /></SelectTrigger>
              <SelectContent>
                {rutas.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.nombre} ({r.codigo})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {err && (
            <div className="text-sm text-destructive flex gap-2 bg-destructive/5 border border-destructive/20 rounded-md p-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{err}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : bus ? "Guardar cambios" : "Crear bus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Modal Reporte ----------
const ReporteDialog = ({
  bus, estaciones, onOpenChange, onSuccess, onError,
}: {
  bus: Bus | null;
  estaciones: Estacion[];
  onOpenChange: (o: boolean) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) => {
  const [estacionId, setEstacionId] = useState<string>("");
  const [pasajeros, setPasajeros] = useState<number>(0);
  const [velocidad, setVelocidad] = useState<number>(25);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (bus) {
      setEstacionId(estaciones[0] ? String(estaciones[0].id) : "");
      setPasajeros(Math.floor(bus.capacidad * 0.4));
      setVelocidad(25);
      setErr(null);
    }
  }, [bus, estaciones]);

  if (!bus) return null;

  const pct = Math.round((pasajeros / bus.capacidad) * 100);
  const exceeds = pasajeros > bus.capacidad;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    const est = estaciones.find((s) => String(s.id) === String(estacionId));
    if (!est) { setErr("Estación inválida"); setBusy(false); return; }
    const r = await registrarReporte({
      bus_id: bus.id,
      latitud: est.latitud,
      longitud: est.longitud,
      cantidad_pasajeros: pasajeros,
      velocidad_kmh: velocidad,
      estacion_id: est.id,
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error?.message ?? "Error"); onError(r.error?.message ?? "Error"); return; }
    onSuccess(`Reporte para ${bus.codigo} guardado`);
    onOpenChange(false);
  };

  return (
    <Dialog open={!!bus} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar reporte · {bus.codigo}</DialogTitle>
          <DialogDescription>
            Endpoint: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">POST /reportes</code>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Estación / Ubicación</Label>
            <Select value={estacionId} onValueChange={setEstacionId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {estaciones.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.nombre} — {s.distrito}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pas">Pasajeros</Label>
              <Input id="pas" type="number" min={0} value={pasajeros}
                onChange={(e) => setPasajeros(Number(e.target.value))} required />
              <p className="text-xs text-muted-foreground mt-1">Capacidad: {bus.capacidad}</p>
            </div>
            <div>
              <Label htmlFor="vel">Velocidad (km/h)</Label>
              <Input id="vel" type="number" min={0} max={120} value={velocidad}
                onChange={(e) => setVelocidad(Number(e.target.value))} required />
            </div>
          </div>

          <div className={`rounded-lg p-3 text-sm ${exceeds ? "bg-destructive/10 text-destructive border border-destructive/30" : "bg-muted"}`}>
            <div className="flex items-center justify-between">
              <span>Ocupación calculada</span>
              <strong>{pct}%</strong>
            </div>
            {exceeds && <p className="text-xs mt-1">⚠ Excede la capacidad del bus — el backend rechazará este reporte.</p>}
          </div>

          {err && (
            <div className="text-sm text-destructive flex gap-2 bg-destructive/5 border border-destructive/20 rounded-md p-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{err}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy || exceeds}>
              <CheckCircle2 className="w-4 h-4" /> {busy ? "Registrando…" : "Registrar reporte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BusesPage;
