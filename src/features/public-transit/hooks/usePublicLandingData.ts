import { useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/httpClient";

import {
  listPublicBuses,
  listPublicEstaciones,
  listPublicReportes,
  listPublicRutas,
  listPublicRutaEstacionesByRuta,
} from "../api/publicTransitApi";
import { buildPublicLiveViews } from "../helpers/liveView";
import type {
  PublicBus,
  PublicBusLiveView,
  PublicEstacion,
  PublicReporte,
  PublicRuta,
  PublicRutaEstacion,
} from "../types";

export function usePublicLandingData() {
  const [rutas, setRutas] = useState<PublicRuta[]>([]);
  const [estaciones, setEstaciones] = useState<PublicEstacion[]>([]);
  const [buses, setBuses] = useState<PublicBus[]>([]);
  const [reportes, setReportes] = useState<PublicReporte[]>([]);
  const [routeStationsByRouteId, setRouteStationsByRouteId] = useState<Record<string, PublicRutaEstacion[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");

  useEffect(() => {
    let active = true;

    const loadStaticData = async () => {
      try {
        setError(null);
        setLoading(true);

        const [nextRutas, nextEstaciones] = await Promise.all([
          listPublicRutas(),
          listPublicEstaciones(),
        ]);

        if (!active) return;

        setRutas(nextRutas);
        setEstaciones(nextEstaciones);

        const routeStationEntries = await Promise.all(
          nextRutas.map(async (ruta) => [ruta.id, await listPublicRutaEstacionesByRuta(ruta.id)] as const),
        );

        if (!active) return;

        setRouteStationsByRouteId(Object.fromEntries(routeStationEntries));
      } catch (error) {
        if (!active) return;
        setError(getApiErrorMessage(error, "No se pudo cargar la informacion publica"));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadStaticData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadLiveData = async () => {
      try {
        const [nextBuses, nextReportes] = await Promise.all([
          listPublicBuses(),
          listPublicReportes(),
        ]);

        if (!active) return;

        setBuses(nextBuses);
        setReportes(nextReportes);
        setLastUpdatedAt(new Date().toISOString());
      } catch (error) {
        if (!active) return;
        setError(getApiErrorMessage(error, "No se pudo actualizar el monitoreo publico"));
      }
    };

    void loadLiveData();
    const interval = setInterval(() => {
      void loadLiveData();
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const estacionesById = useMemo(
    () => new Map(estaciones.map((estacion) => [estacion.id, estacion])),
    [estaciones],
  );

  const busesEnVivo = useMemo<PublicBusLiveView[]>(
    () =>
      buildPublicLiveViews({
        buses,
        estacionesById,
        reportes,
        routeStationsByRouteId,
      }),
    [buses, estacionesById, reportes, routeStationsByRouteId],
  );

  return {
    rutas,
    estaciones,
    buses,
    reportes,
    busesEnVivo,
    routeStationsByRouteId,
    loading,
    error,
    lastUpdatedAt,
  };
}
