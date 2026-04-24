import { haversineDistanceMeters } from "@/features/bus-tracking/helpers/haversine";

import type {
  PublicBus,
  PublicBusLiveView,
  PublicEstacion,
  PublicReporte,
  PublicRutaEstacion,
} from "../types";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function findNearestStationId(
  report: PublicReporte,
  routeStations: PublicRutaEstacion[],
  estacionesById: Map<string, PublicEstacion>,
) {
  if (report.estacionId) return report.estacionId;

  let nearestStationId: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  routeStations.forEach((routeStation) => {
    const estacion = estacionesById.get(routeStation.estacionId);
    if (!estacion) return;

    const distance = haversineDistanceMeters(report, estacion);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestStationId = estacion.id;
    }
  });

  return nearestStationId;
}

function getDirection(
  currentStation: PublicEstacion | undefined,
  nextStation: PublicEstacion | undefined,
): PublicBusLiveView["direccion"] {
  if (!currentStation || !nextStation) return null;
  if (nextStation.latitud > currentStation.latitud) return "norte";
  if (nextStation.latitud < currentStation.latitud) return "sur";
  return nextStation.longitud > currentStation.longitud ? "norte" : "sur";
}

export function buildPublicLiveViews({
  buses,
  estacionesById,
  reportes,
  routeStationsByRouteId,
}: {
  buses: PublicBus[];
  estacionesById: Map<string, PublicEstacion>;
  reportes: PublicReporte[];
  routeStationsByRouteId: Record<string, PublicRutaEstacion[]>;
}) {
  const latestByBus = new Map<string, PublicReporte>();
  const sortedReports = [...reportes].sort((left, right) => +new Date(right.timestamp) - +new Date(left.timestamp));

  sortedReports.forEach((report) => {
    if (!latestByBus.has(report.busId)) {
      latestByBus.set(report.busId, report);
    }
  });

  return buses.map<PublicBusLiveView>((bus) => {
    const routeStations = bus.rutaId ? routeStationsByRouteId[bus.rutaId] ?? [] : [];
    const latestReport = latestByBus.get(bus.id);
    const currentStationId = latestReport
      ? findNearestStationId(latestReport, routeStations, estacionesById)
      : routeStations[0]?.estacionId ?? null;
    const currentIndex = currentStationId ? routeStations.findIndex((row) => row.estacionId === currentStationId) : -1;
    const nextStationId = currentIndex >= 0 ? routeStations[currentIndex + 1]?.estacionId ?? null : null;
    const currentStation = currentStationId ? estacionesById.get(currentStationId) : undefined;
    const nextStation = nextStationId ? estacionesById.get(nextStationId) : undefined;

    let progreso = 0;
    let etaMinutos: number | null = null;

    if (latestReport && currentStation && nextStation) {
      const segmentDistance = haversineDistanceMeters(currentStation, nextStation);
      const traveledDistance = haversineDistanceMeters(currentStation, latestReport);
      progreso = segmentDistance > 0 ? clamp(traveledDistance / segmentDistance) : 0;

      if (latestReport.velocidadKmh && latestReport.velocidadKmh > 0) {
        const remainingDistance = haversineDistanceMeters(latestReport, nextStation);
        etaMinutos = Math.max(1, Math.round(remainingDistance / ((latestReport.velocidadKmh * 1000) / 60)));
      }
    }

    return {
      id: bus.id,
      codigo: bus.codigo,
      placa: bus.placa,
      rutaId: bus.rutaId,
      capacidad: bus.capacidad,
      ocupacionActual: latestReport?.cantidadPasajeros ?? 0,
      estado: bus.estado,
      estacionActualId: currentStationId,
      estacionSiguienteId: nextStationId,
      progreso,
      velocidadKmh: latestReport?.velocidadKmh ?? null,
      etaMinutos,
      ultimaActualizacion: latestReport?.timestamp ?? bus.createdAt,
      latitud: latestReport?.latitud ?? currentStation?.latitud ?? -12.046374,
      longitud: latestReport?.longitud ?? currentStation?.longitud ?? -77.042793,
      direccion: getDirection(currentStation, nextStation),
    };
  });
}
