import { useEffect, useState } from "react";
import {
  Plus, Edit2, Trash2, MapPin, AlertCircle, ChevronLeft, ChevronRight, Search,
} from "lucide-react";
import {
  actualizarEstacion, crearEstacion, eliminarEstacion, listarEstaciones,
} from "@/lib/api/metropolitanoApi";
import type { CreateEstacionDto, Estacion } from "@/lib/api/types";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 12;

const EstacionesPage = () => {
  const v = useStoreVersion();
  const { toast } = useToast();

  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Estacion | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Estacion | null>(null);

  useEffect(() => { listarEstaciones().then(setEstaciones); }, [v]);
  useEffect(() => { setPage(1); }, [search]);

  const filtered = estaciones.filter((e) =>
    !search ||
    e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    e.distrito.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onConfirmDelete = async () => {
    if (!deleting) return;
    const r = await eliminarEstacion(deleting.id);
    setDeleting(null);
    if (r.ok) toast({ title: "Estación eliminada", description: deleting.nombre });
    else toast({ title: "Error", description: r.error?.message, variant: "destructive" });
  };

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Gestión de estaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            CRUD del catálogo de paradas · Endpoint: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/estaciones</code>
          </p>
        </div>
        <Button onClick={() => setCreating(true)} size="lg" className="shadow-elegant">
          <Plus className="w-4 h-4" /> Nueva estación
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 shadow-card relative max-w-md">
        <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o distrito…" className="pl-9" maxLength={50} />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead className="text-right">Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Distrito</TableHead>
              <TableHead className="text-right">Latitud</TableHead>
              <TableHead className="text-right">Longitud</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Sin estaciones para los filtros actuales.
                </TableCell>
              </TableRow>
            )}
            {paginated.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">#{e.id}</TableCell>
                <TableCell className="text-right font-mono">{e.orden}</TableCell>
                <TableCell className="font-semibold">{e.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{e.distrito}</TableCell>
                <TableCell className="text-right font-mono text-xs">{Number(e.latitud).toFixed(5)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{Number(e.longitud).toFixed(5)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(e)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleting(e)}
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
            <strong className="text-foreground">{filtered.length}</strong> estaciones
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

      <EstacionDialog
        open={creating || !!editing}
        estacion={editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        onSuccess={(msg) => toast({ title: "Listo", description: msg })}
        onError={(msg) => toast({ title: "Error", description: msg, variant: "destructive" })}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la estación {deleting?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se removerá del catálogo y de las rutas que la contengan. Acción irreversible.
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

const EstacionDialog = ({
  open, estacion, onOpenChange, onSuccess, onError,
}: {
  open: boolean; estacion: Estacion | null;
  onOpenChange: (o: boolean) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) => {
  const [form, setForm] = useState<CreateEstacionDto>({
    nombre: "", distrito: "", latitud: -12.05, longitud: -77.04, orden: 1,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        nombre: estacion?.nombre ?? "",
        distrito: estacion?.distrito ?? "",
        latitud: estacion?.latitud ?? -12.05,
        longitud: estacion?.longitud ?? -77.04,
        orden: estacion?.orden ?? 1,
      });
      setErr(null);
    }
  }, [open, estacion]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = estacion ? await actualizarEstacion(estacion.id, form) : await crearEstacion(form);
    setBusy(false);
    if (!r.ok) { setErr(r.error?.message ?? "Error"); onError(r.error?.message ?? "Error"); return; }
    onSuccess(estacion ? `${form.nombre} actualizada` : `${form.nombre} creada`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{estacion ? `Editar estación #${estacion.id}` : "Nueva estación"}</DialogTitle>
          <DialogDescription>Datos de la parada del corredor.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={100} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Distrito *</Label>
              <Input value={form.distrito} onChange={(e) => setForm({ ...form, distrito: e.target.value })} required maxLength={50} />
            </div>
            <div>
              <Label>Orden *</Label>
              <Input type="number" min={1} value={form.orden}
                onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Latitud *</Label>
              <Input type="number" step="0.0000001" min={-90} max={90} value={form.latitud}
                onChange={(e) => setForm({ ...form, latitud: Number(e.target.value) })} required />
            </div>
            <div>
              <Label>Longitud *</Label>
              <Input type="number" step="0.0000001" min={-180} max={180} value={form.longitud}
                onChange={(e) => setForm({ ...form, longitud: Number(e.target.value) })} required />
            </div>
          </div>

          {err && (
            <div className="text-sm text-destructive flex gap-2 bg-destructive/5 border border-destructive/20 rounded-md p-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{err}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy ? "Guardando…" : estacion ? "Guardar" : "Crear estación"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EstacionesPage;
