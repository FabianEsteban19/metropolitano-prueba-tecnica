import { useEffect, useState } from "react";
import {
  Plus, Edit2, Trash2, Route as RouteIcon, AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  actualizarRuta, crearRuta, eliminarRuta, listarRutas,
} from "@/lib/api/metropolitanoApi";
import {
  SERVICIO_TIPOS, type CreateRutaDto, type Ruta, type ServicioTipo,
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 8;

const RutasPage = () => {
  const v = useStoreVersion();
  const { toast } = useToast();

  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Ruta | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Ruta | null>(null);

  useEffect(() => { listarRutas().then(setRutas); }, [v]);

  const totalPages = Math.max(1, Math.ceil(rutas.length / PAGE_SIZE));
  const paginated = rutas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onConfirmDelete = async () => {
    if (!deleting) return;
    const r = await eliminarRuta(deleting.id);
    setDeleting(null);
    if (r.ok) toast({ title: "Ruta eliminada", description: `${deleting.nombre} fue eliminada.` });
    else toast({ title: "No se pudo eliminar", description: r.error?.message, variant: "destructive" });
  };

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Gestión de rutas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            CRUD del catálogo de servicios · Endpoint: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/rutas</code>
          </p>
        </div>
        <Button onClick={() => setCreating(true)} size="lg" className="shadow-elegant">
          <Plus className="w-4 h-4" /> Nueva ruta
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-right">Frecuencia</TableHead>
              <TableHead className="text-right">Estaciones</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <RouteIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No hay rutas registradas.
                </TableCell>
              </TableRow>
            )}
            {paginated.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">#{r.id}</TableCell>
                <TableCell className="font-mono font-bold">{r.codigo}</TableCell>
                <TableCell>{r.nombre}</TableCell>
                <TableCell><Badge variant="secondary">{r.servicio.replace("_", " ")}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border border-border" style={{ background: r.color }} />
                    <span className="font-mono text-xs text-muted-foreground">{r.color}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{r.frecuencia_min} min</TableCell>
                <TableCell className="text-right font-mono">{r.estacion_ids?.length ?? 0}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(r)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleting(r)}
                      className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <div className="text-muted-foreground">
            Total: <strong className="text-foreground">{rutas.length}</strong> rutas
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono text-xs px-3 py-1.5 bg-muted rounded">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <RutaDialog
        open={creating || !!editing}
        ruta={editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        onSuccess={(msg) => toast({ title: "Listo", description: msg })}
        onError={(msg) => toast({ title: "Error", description: msg, variant: "destructive" })}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la ruta {deleting?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              No podrás eliminarla si hay buses asignados. Reasigna los buses primero.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const RutaDialog = ({
  open, ruta, onOpenChange, onSuccess, onError,
}: {
  open: boolean; ruta: Ruta | null;
  onOpenChange: (o: boolean) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) => {
  const [form, setForm] = useState<CreateRutaDto>({
    codigo: "", nombre: "", servicio: "Regular",
    color: "#E30613", frecuencia_min: 5,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        codigo: ruta?.codigo ?? "",
        nombre: ruta?.nombre ?? "",
        servicio: ruta?.servicio ?? "Regular",
        color: ruta?.color ?? "#E30613",
        frecuencia_min: ruta?.frecuencia_min ?? 5,
      });
      setErr(null);
    }
  }, [open, ruta]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = ruta ? await actualizarRuta(ruta.id, form) : await crearRuta(form);
    setBusy(false);
    if (!r.ok) { setErr(r.error?.message ?? "Error"); onError(r.error?.message ?? "Error"); return; }
    onSuccess(ruta ? `Ruta ${form.codigo} actualizada` : `Ruta ${form.codigo} creada`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ruta ? `Editar ruta #${ruta.id}` : "Nueva ruta"}</DialogTitle>
          <DialogDescription>
            Registra una nueva ruta del corredor con su tipo de servicio y frecuencia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código *</Label>
              <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required maxLength={10} placeholder="A" />
            </div>
            <div>
              <Label>Frecuencia (min) *</Label>
              <Input type="number" min={1} max={60} value={form.frecuencia_min}
                onChange={(e) => setForm({ ...form, frecuencia_min: Number(e.target.value) })} required />
            </div>
          </div>
          <div>
            <Label>Nombre *</Label>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={100} placeholder="Expreso 1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Servicio (ENUM)</Label>
              <Select value={form.servicio} onValueChange={(v) => setForm({ ...form, servicio: v as ServicioTipo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICIO_TIPOS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2">
                <input type="color" value={form.color.startsWith("#") ? form.color : "#E30613"}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-10 w-12 rounded-md border border-input cursor-pointer" />
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
            </div>
          </div>

          {err && (
            <div className="text-sm text-destructive flex gap-2 bg-destructive/5 border border-destructive/20 rounded-md p-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{err}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy ? "Guardando…" : ruta ? "Guardar" : "Crear ruta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RutasPage;
