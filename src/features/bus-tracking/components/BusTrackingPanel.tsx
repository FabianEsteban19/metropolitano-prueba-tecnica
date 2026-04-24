import { useEffect, useMemo, useState } from "react";
import { Activity, Bus, LocateFixed, MapPin, Play, RefreshCcw, Route, Square, Timer } from "lucide-react";

import type { Bus as TrackingBusEntity, Ruta as TrackingRutaEntity } from "@/api/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api/httpClient";

import { trackingReferenceApi } from "../api/referenceApi";
import { useBusTracking } from "../hooks/useBusTracking";
import type { RouteStation } from "../types";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("es-PE", {
    hour12: false,
  });
}

function formatDistance(distance: number | null | undefined) {
  if (distance == null) return "-";
  if (distance < 1000) return `${Math.round(distance)} m`;
  return `${(distance / 1000).toFixed(2)} km`;
}

function RouteProgress({
  routeStations,
  nearestStationId,
  nextStationId,
}: {
  routeStations: RouteStation[];
  nearestStationId: string | null;
  nextStationId: string | null;
}) {
  if (routeStations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Selecciona una ruta valida para cargar sus estaciones.
      </div>
    );
  }

  const trackWidth = Math.max(routeStations.length * 108, 720);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h3 className="font-display text-xl font-bold">Progreso sobre la ruta</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        La estacion resaltada indica proximidad detectada y la siguiente marca el proximo destino probable.
      </p>
      {routeStations.length > 8 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Desliza horizontalmente para ver todas las estaciones del recorrido.
        </p>
      )}

      <div className="mt-8 overflow-x-auto pb-3">
        <div className="relative min-w-full px-1" style={{ width: `${trackWidth}px` }}>
          <div className="absolute left-0 right-0 top-2 h-1 rounded-full bg-muted" />
          <ol
            className="relative grid gap-x-3 gap-y-6"
            style={{ gridTemplateColumns: `repeat(${routeStations.length}, minmax(96px, 1fr))` }}
          >
            {routeStations.map((routeStation) => {
              const isNearest = routeStation.estacionId === nearestStationId;
              const isNext = routeStation.estacionId === nextStationId;

              return (
                <li key={routeStation.estacionId} className="relative flex flex-col items-center text-center">
                  <div
                    className={`z-10 h-5 w-5 rounded-full border-2 border-background transition-smooth ${
                      isNearest
                        ? "bg-primary shadow-glow"
                        : isNext
                          ? "bg-accent shadow-md"
                          : "bg-muted-foreground/40"
                    }`}
                  />
                  <span
                    className="mt-3 min-h-[2.75rem] max-w-[92px] text-[11px] leading-tight text-muted-foreground"
                    title={routeStation.estacion.nombre}
                  >
                    {routeStation.estacion.nombre}
                  </span>
                  <span className="mt-1 text-[10px] text-muted-foreground">#{routeStation.orden}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function BusTrackingPanel() {
  const [busId, setBusId] = useState("");
  const [rutaId, setRutaId] = useState("");
  const [buses, setBuses] = useState<TrackingBusEntity[]>([]);
  const [rutas, setRutas] = useState<TrackingRutaEntity[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [referencesError, setReferencesError] = useState<string | null>(null);
  const [intervalMs, setIntervalMs] = useState("120000");
  const [proximityRadiusMeters, setProximityRadiusMeters] = useState("100");
  const [cantidadPasajeros, setCantidadPasajeros] = useState("42");
  const [ocupacionPct, setOcupacionPct] = useState("52.5");
  const [velocidadKmh, setVelocidadKmh] = useState("34.8");
  const [useSimulation, setUseSimulation] = useState(true);

  const parsedIntervalMs = Math.max(1000, Number(intervalMs) || 120000);
  const parsedRadiusMeters = Math.max(1, Number(proximityRadiusMeters) || 100);
  const parsedCantidadPasajeros = Math.max(0, Number(cantidadPasajeros) || 0);
  const parsedOcupacionPct = ocupacionPct.trim() === "" || Number.isNaN(Number(ocupacionPct)) ? null : Number(ocupacionPct);
  const parsedVelocidadKmh = velocidadKmh.trim() === "" || Number.isNaN(Number(velocidadKmh)) ? null : Number(velocidadKmh);

  const selectedBus = useMemo(() => buses.find((bus) => bus.id === busId) ?? null, [buses, busId]);
  const selectedRuta = useMemo(() => rutas.find((ruta) => ruta.id === rutaId) ?? null, [rutas, rutaId]);

  useEffect(() => {
    let active = true;

    const loadReferences = async () => {
      try {
        setReferencesLoading(true);
        setReferencesError(null);

        const [nextBuses, nextRutas] = await Promise.all([
          trackingReferenceApi.listBuses(),
          trackingReferenceApi.listRutas(),
        ]);

        if (!active) return;

        setBuses(nextBuses);
        setRutas(nextRutas);
      } catch (error) {
        if (!active) return;
        setReferencesError(getApiErrorMessage(error, "No se pudieron cargar buses y rutas"));
      } finally {
        if (active) {
          setReferencesLoading(false);
        }
      }
    };

    void loadReferences();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedBus?.rutaId) {
      setRutaId(selectedBus.rutaId);
    }
  }, [busId, selectedBus?.rutaId]);

  const tracking = useBusTracking({
    busId: busId.trim(),
    rutaId: rutaId.trim(),
    intervalMs: parsedIntervalMs,
    proximityRadiusMeters: parsedRadiusMeters,
    useSimulation,
    cantidadPasajeros: parsedCantidadPasajeros,
    ocupacionPct: parsedOcupacionPct,
    velocidadKmh: parsedVelocidadKmh,
  });

  const trackingStatus = useMemo(() => {
    if (tracking.error) return "error";
    if (tracking.trackingActive) return "tracking";
    if (tracking.lastReport) return "ready";
    return "idle";
  }, [tracking.error, tracking.lastReport, tracking.trackingActive]);

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Monitoreo operativo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Seguimiento automatico del bus, deteccion de cercania a estaciones y envio de reportes al backend.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void tracking.refreshRouteStations()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-smooth border border-border bg-card hover:bg-muted"
          >
            <RefreshCcw className="w-4 h-4" /> Recargar ruta
          </button>
          <button
            onClick={() => void tracking.runTrackingCycle()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-smooth border border-border bg-card hover:bg-muted"
          >
            <LocateFixed className="w-4 h-4" /> Ejecutar ahora
          </button>
          <button
            onClick={() => void (tracking.trackingActive ? tracking.stopTracking() : tracking.startTracking())}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-smooth shadow-card ${
              tracking.trackingActive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary-glow"
            }`}
          >
            {tracking.trackingActive ? <><Square className="w-4 h-4" /> Detener monitoreo</> : <><Play className="w-4 h-4" /> Iniciar monitoreo</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display font-semibold text-lg mb-5">Configuracion</h2>

          {referencesError && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {referencesError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Bus</label>
              <Select value={busId} onValueChange={setBusId} disabled={referencesLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={referencesLoading ? "Cargando buses..." : "Selecciona un bus"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {buses.map((bus) => (
                    <SelectItem key={bus.id} value={bus.id}>
                      {bus.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-1 text-xs text-muted-foreground break-all">
                {selectedBus ? `ID enviado: ${selectedBus.id}` : "El monitoreo enviara el UUID del bus seleccionado."}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Ruta</label>
              <Select value={rutaId} onValueChange={setRutaId} disabled={referencesLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={referencesLoading ? "Cargando rutas..." : "Selecciona una ruta"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {rutas.map((ruta) => (
                    <SelectItem key={ruta.id} value={ruta.id}>
                      {ruta.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-1 text-xs text-muted-foreground break-all">
                {selectedRuta ? `ID enviado: ${selectedRuta.id}` : "Selecciona la ruta para cargar sus estaciones."}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Intervalo (ms)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={intervalMs}
                onChange={(event) => setIntervalMs(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Radio de cercania (m)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={proximityRadiusMeters}
                onChange={(event) => setProximityRadiusMeters(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Cantidad de pasajeros</label>
              <input
                type="number"
                min="0"
                step="1"
                value={cantidadPasajeros}
                onChange={(event) => setCantidadPasajeros(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Ocupacion %</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={ocupacionPct}
                onChange={(event) => setOcupacionPct(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Velocidad km/h (fallback)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={velocidadKmh}
                onChange={(event) => setVelocidadKmh(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-end">
              <label className="w-full rounded-xl border border-border bg-background px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Ubicacion simulada</div>
                  <div className="text-xs text-muted-foreground">
                    Si la desactivas, intenta geolocalizacion real y vuelve a simulacion si falla.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useSimulation}
                  onChange={(event) => setUseSimulation(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display font-semibold text-lg mb-5">Estado</h2>
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Tracking</div>
              <div className="mt-1 font-display text-2xl font-bold">
                {trackingStatus === "tracking"
                  ? "Activo"
                  : trackingStatus === "error"
                    ? "Con error"
                    : trackingStatus === "ready"
                      ? "Listo"
                      : "En espera"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Estaciones",
                  value: tracking.routeStations.length,
                  icon: Route,
                },
                {
                  label: "Intervalo",
                  value: `${Math.round(parsedIntervalMs / 1000)}s`,
                  icon: Timer,
                },
                {
                  label: "Fuente",
                  value: tracking.currentLocation?.source ?? (useSimulation ? "simulation" : "geolocation"),
                  icon: LocateFixed,
                },
                {
                  label: "Ultimo reporte",
                  value: tracking.lastReport ? "OK" : "-",
                  icon: Activity,
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border p-4">
                  <item.icon className="w-4 h-4 text-muted-foreground mb-2" />
                  <div className="font-display text-xl font-bold">{item.value}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{item.label}</div>
                </div>
              ))}
            </div>

            {tracking.error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {tracking.error}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          {
            label: "Ubicacion actual",
            value: tracking.currentLocation
              ? `${tracking.currentLocation.latitud}, ${tracking.currentLocation.longitud}`
              : "-",
            sub: tracking.currentLocation ? tracking.currentLocation.source : "sin lectura",
            icon: LocateFixed,
          },
          {
            label: "Estacion detectada",
            value: tracking.nearestStation?.estacion.nombre ?? "-",
            sub: formatDistance(tracking.nearestStation?.distanceMeters),
            icon: MapPin,
          },
          {
            label: "Estacion mas cercana",
            value: tracking.closestStation?.estacion.nombre ?? "-",
            sub: formatDistance(tracking.closestStation?.distanceMeters),
            icon: Route,
          },
          {
            label: "Siguiente probable",
            value: tracking.nextStation?.estacion.nombre ?? "-",
            sub: tracking.nextStation ? `Orden ${tracking.nextStation.orden}` : "sin calculo",
            icon: Bus,
          },
          {
            label: "Ultimo reporte",
            value: formatDateTime(tracking.lastReport?.response.timestamp ?? tracking.lastReport?.payload.timestamp),
            sub: tracking.lastReport?.response.velocidadKmh != null ? `${tracking.lastReport.response.velocidadKmh} km/h` : "sin velocidad",
            icon: Activity,
          },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <item.icon className="w-4 h-4 text-muted-foreground mb-2" />
            <div className="font-display font-bold text-lg break-words">{item.value}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{item.label}</div>
            <div className="text-xs text-muted-foreground mt-2">{item.sub}</div>
          </div>
        ))}
      </div>

      <RouteProgress
        routeStations={tracking.routeStations}
        nearestStationId={tracking.nearestStation?.estacionId ?? null}
        nextStationId={tracking.nextStation?.estacionId ?? null}
      />

      {tracking.lastReport && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-bold mb-3">Ultimo payload enviado</h2>
          <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-6">
            {JSON.stringify(tracking.lastReport.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
