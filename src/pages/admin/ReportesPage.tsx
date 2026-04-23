import { useEffect, useMemo, useState } from "react";
import { listarBuses, listarEstaciones, listarReportes, listarRutas } from "@/lib/api/metropolitanoApi";
import type { Bus, Estacion, Reporte, Ruta } from "@/lib/api/types";
import { useStoreVersion } from "@/lib/hooks/useStoreVersion";
import { Search, ChevronLeft, ChevronRight, FileBarChart2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 15;

const ReportesPage = () => {
  const v = useStoreVersion();
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [buses, setBuses] = useState<Bus[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);

  const [busFilter, setBusFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    listarBuses({ page: 1, page_size: 1000 }).then((r) => r.ok && r.data && setBuses(r.data.items));
    listarEstaciones().then(setEstaciones);
    listarRutas().then(setRutas);
  }, [v]);

  useEffect(() => {
    listarReportes({
      page,
      page_size: PAGE_SIZE,
      bus_id: busFilter !== "todos" ? Number(busFilter) : null,
    }).then((r) => {
      if (r.ok && r.data) {
        setReportes(r.data.items);
        setTotal(r.data.total);
      }
    });
  }, [v, page, busFilter]);

  useEffect(() => { setPage(1); }, [busFilter, search]);

  const filtered = useMemo(() => {
    if (!search) return reportes;
    const q = search.toLowerCase();
    return reportes.filter((r) => {
      const bus = buses.find((b) => b.id === r.bus_id);
      const txt = `${bus?.codigo ?? ""} ${bus?.placa ?? ""}`.toLowerCase();
      return txt.includes(q);
    });
  }, [reportes, search, buses]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div>
        <h1 className="font-display font-bold text-3xl tracking-tight">Reportes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Listado global · Endpoint: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">GET /reportes</code>
        </p>
      </div>

      <div className="flex flex-wrap gap-3 bg-card border border-border rounded-xl p-3 shadow-card">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por bus en la página actual…" maxLength={50} className="pl-9" />
        </div>
        <Select value={busFilter} onValueChange={setBusFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Bus" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="todos">Todos los buses</SelectItem>
            {buses.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                #{b.id} · {b.codigo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Fecha / hora</TableHead>
              <TableHead>Bus</TableHead>
              <TableHead>Ruta</TableHead>
              <TableHead>Estación</TableHead>
              <TableHead className="text-right">Pasajeros</TableHead>
              <TableHead className="text-right">Ocupación</TableHead>
              <TableHead className="text-right">Velocidad</TableHead>
              <TableHead className="text-right hidden md:table-cell">Coordenadas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                  <FileBarChart2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Sin reportes que mostrar.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => {
              const bus = buses.find((b) => b.id === r.bus_id);
              const est = estaciones.find((s) => s.id === r.estacion_id);
              const ruta = rutas.find((rt) => rt.id === bus?.ruta_id);
              const pct = r.ocupacion_pct ?? 0;
              const pctColor = pct >= 85 ? "text-destructive" : pct >= 60 ? "text-warning" : "text-success";
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{r.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleString("es-PE")}
                  </TableCell>
                  <TableCell className="font-mono font-semibold">{bus?.codigo ?? `#${r.bus_id}`}</TableCell>
                  <TableCell className="text-xs">{ruta?.nombre ?? "—"}</TableCell>
                  <TableCell className="text-xs">{est?.nombre ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{r.cantidad_pasajeros}/{bus?.capacidad ?? "?"}</TableCell>
                  <TableCell className={`text-right font-mono font-semibold ${pctColor}`}>{pct}%</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.velocidad_kmh ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono text-[10px] text-muted-foreground hidden md:table-cell">
                    {Number(r.latitud).toFixed(4)}, {Number(r.longitud).toFixed(4)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <div className="text-muted-foreground">
            Mostrando <strong className="text-foreground">{filtered.length}</strong> de{" "}
            <strong className="text-foreground">{total}</strong> reportes
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
    </div>
  );
};

export default ReportesPage;
