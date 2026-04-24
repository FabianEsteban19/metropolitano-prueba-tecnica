import { useCallback, useEffect, useRef, useState } from "react";

import type { CreateReporteRequest } from "@/api/types";
import { getApiErrorMessage } from "@/lib/api/httpClient";

import { trackingReportesApi } from "../api/reportesApi";
import { trackingRutaEstacionesApi } from "../api/rutaEstacionesApi";
import { haversineDistanceMeters } from "../helpers/haversine";
import { buildSimulatedLocation } from "../helpers/simulatedLocation";
import type {
  BusTrackingConfig,
  RouteStation,
  RouteStationDistance,
  SimulationState,
  TrackingLocation,
  TrackingReport,
} from "../types";

async function getGeolocationPosition(): Promise<TrackingLocation> {
  if (!("geolocation" in navigator)) {
    throw new Error("El navegador no soporta geolocalizacion");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const speedMps = typeof position.coords.speed === "number" ? position.coords.speed : null;

        resolve({
          latitud: Number(position.coords.latitude.toFixed(7)),
          longitud: Number(position.coords.longitude.toFixed(7)),
          timestamp: new Date(position.timestamp).toISOString(),
          velocidadKmh: speedMps != null ? Number((speedMps * 3.6).toFixed(1)) : null,
          accuracyMeters: position.coords.accuracy ?? null,
          source: "geolocation",
        });
      },
      () => {
        reject(new Error("No se pudo obtener la geolocalizacion actual"));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

function findNearestStations(
  location: TrackingLocation,
  routeStations: RouteStation[],
  proximityRadiusMeters: number,
) {
  const withDistance = routeStations
    .map<RouteStationDistance>((routeStation) => ({
      ...routeStation,
      distanceMeters: haversineDistanceMeters(location, routeStation.estacion),
    }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters);

  const closest = withDistance[0] ?? null;
  const nearestStation = closest && closest.distanceMeters <= proximityRadiusMeters ? closest : null;

  if (!closest) {
    return {
      closestStation: null,
      nearestStation: null,
      nextStation: null,
    };
  }

  const index = routeStations.findIndex((routeStation) => routeStation.estacionId === closest.estacionId);
  const nextStation = index >= 0 ? routeStations[index + 1] ?? null : null;

  return {
    closestStation: closest,
    nearestStation,
    nextStation,
  };
}

export function useBusTracking(config: BusTrackingConfig) {
  const [loading, setLoading] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeStations, setRouteStations] = useState<RouteStation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<TrackingLocation | null>(null);
  const [nearestStation, setNearestStation] = useState<RouteStationDistance | null>(null);
  const [closestStation, setClosestStation] = useState<RouteStationDistance | null>(null);
  const [nextStation, setNextStation] = useState<RouteStation | null>(null);
  const [lastReport, setLastReport] = useState<TrackingReport | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulationStateRef = useRef<SimulationState>({ segmentIndex: 0, progressIndex: 0 });

  const loadRouteStations = useCallback(async () => {
    if (!config.rutaId.trim()) {
      setRouteStations([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const stations = await trackingRutaEstacionesApi.listByRuta(config.rutaId.trim());
      setRouteStations(stations);
    } catch (error) {
      setError(getApiErrorMessage(error, "No se pudieron cargar las estaciones de la ruta"));
    } finally {
      setLoading(false);
    }
  }, [config.rutaId]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const stations = await trackingRutaEstacionesApi.listByRuta(config.rutaId.trim());
        if (!active) return;
        setRouteStations(stations);
      } catch (error) {
        if (!active) return;
        setError(getApiErrorMessage(error, "No se pudieron cargar las estaciones de la ruta"));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (config.rutaId.trim()) {
      void run();
    } else {
      setRouteStations([]);
    }

    return () => {
      active = false;
    };
  }, [config.rutaId]);

  const resolveLocation = useCallback(async () => {
    if (config.useSimulation) {
      return buildSimulatedLocation(routeStations, simulationStateRef.current);
    }

    try {
      return await getGeolocationPosition();
    } catch {
      return buildSimulatedLocation(routeStations, simulationStateRef.current);
    }
  }, [config.useSimulation, routeStations]);

  const sendTrackingReport = useCallback(async () => {
    if (!config.busId.trim()) {
      throw new Error("Ingresa un busId valido");
    }
    if (!config.rutaId.trim()) {
      throw new Error("Ingresa una rutaId valida");
    }
    if (routeStations.length === 0) {
      throw new Error("La ruta no tiene estaciones disponibles para monitoreo");
    }

    const location = await resolveLocation();
    const stationState = findNearestStations(location, routeStations, config.proximityRadiusMeters);
    const velocidadKmh = location.velocidadKmh ?? config.velocidadKmh ?? null;

    const payload: CreateReporteRequest = {
      busId: config.busId.trim(),
      latitud: location.latitud,
      longitud: location.longitud,
      cantidadPasajeros: config.cantidadPasajeros,
      timestamp: location.timestamp,
      estacionId: stationState.nearestStation?.estacionId ?? undefined,
      ocupacionPct: config.ocupacionPct,
      velocidadKmh,
    };

    const response = await trackingReportesApi.create(payload);
    const report: TrackingReport = {
      payload,
      response,
      location,
      nearestStation: stationState.nearestStation,
      nextStation: stationState.nextStation,
    };

    setCurrentLocation(location);
    setClosestStation(stationState.closestStation);
    setNearestStation(stationState.nearestStation);
    setNextStation(stationState.nextStation);
    setLastReport(report);

    return report;
  }, [config, resolveLocation, routeStations]);

  const runTrackingCycle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await sendTrackingReport();
    } catch (error) {
      setError(getApiErrorMessage(error, "No se pudo completar el monitoreo del bus"));
    } finally {
      setLoading(false);
    }
  }, [sendTrackingReport]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTrackingActive(false);
  }, []);

  const startTracking = useCallback(async () => {
    stopTracking();
    setTrackingActive(true);
    await runTrackingCycle();

    intervalRef.current = setInterval(() => {
      void runTrackingCycle();
    }, config.intervalMs);
  }, [config.intervalMs, runTrackingCycle, stopTracking]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    loading,
    trackingActive,
    error,
    routeStations,
    currentLocation,
    closestStation,
    nearestStation,
    nextStation,
    lastReport,
    refreshRouteStations: loadRouteStations,
    runTrackingCycle,
    startTracking,
    stopTracking,
  };
}
