import type { RouteStation, SimulationState, TrackingLocation } from "../types";

const PROGRESS_STEPS = [0.12, 0.38, 0.62, 0.88] as const;

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function jitter() {
  return (Math.random() - 0.5) * 0.00012;
}

export function buildSimulatedLocation(
  routeStations: RouteStation[],
  state: SimulationState,
): TrackingLocation {
  if (routeStations.length === 0) {
    return {
      latitud: -12.046374,
      longitud: -77.042793,
      timestamp: new Date().toISOString(),
      velocidadKmh: 0,
      accuracyMeters: null,
      source: "simulation",
    };
  }

  const currentIndex = state.segmentIndex % routeStations.length;
  const nextIndex = routeStations.length > 1 ? (currentIndex + 1) % routeStations.length : currentIndex;
  const current = routeStations[currentIndex].estacion;
  const next = routeStations[nextIndex].estacion;
  const progress = PROGRESS_STEPS[state.progressIndex % PROGRESS_STEPS.length];

  const latitud = interpolate(current.latitud, next.latitud, progress) + jitter();
  const longitud = interpolate(current.longitud, next.longitud, progress) + jitter();
  const velocidadKmh = currentIndex === nextIndex ? 8 : Math.round(18 + progress * 14);

  state.progressIndex += 1;
  if (state.progressIndex >= PROGRESS_STEPS.length) {
    state.progressIndex = 0;
    state.segmentIndex = nextIndex;
  }

  return {
    latitud: Number(latitud.toFixed(7)),
    longitud: Number(longitud.toFixed(7)),
    timestamp: new Date().toISOString(),
    velocidadKmh,
    accuracyMeters: null,
    source: "simulation",
  };
}
