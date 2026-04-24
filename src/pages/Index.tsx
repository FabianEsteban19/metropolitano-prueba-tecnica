import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/metropolitano/Header";
import { Hero } from "@/components/metropolitano/Hero";
import { RoutesSection } from "@/components/metropolitano/RoutesSection";
import { ScheduleSection } from "@/components/metropolitano/ScheduleSection";
import { LiveTracking } from "@/components/metropolitano/LiveTracking";
import { Footer } from "@/components/metropolitano/Footer";
import { usePublicLandingData } from "@/features/public-transit/hooks/usePublicLandingData";

const Index = () => {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const { rutas, estaciones, buses, busesEnVivo, routeStationsByRouteId, lastUpdatedAt } = usePublicLandingData();

  useEffect(() => {
    if (!selectedRouteId && rutas.length > 0) {
      setSelectedRouteId(rutas[0].id);
    }
  }, [rutas, selectedRouteId]);

  const stationCountByRouteId = useMemo(
    () =>
      Object.fromEntries(
        rutas.map((ruta) => [ruta.id, routeStationsByRouteId[ruta.id]?.length ?? 0]),
      ),
    [routeStationsByRouteId, rutas],
  );

  const estacionesById = useMemo(
    () => new Map(estaciones.map((estacion) => [estacion.id, estacion])),
    [estaciones],
  );

  const frecuenciaMinima = useMemo(() => {
    if (rutas.length === 0) return null;
    return rutas.reduce((min, ruta) => Math.min(min, ruta.frecuenciaMin), rutas[0].frecuenciaMin);
  }, [rutas]);

  const busesActivosCount = useMemo(
    () => buses.filter((bus) => bus.estado !== "fuera_servicio").length,
    [buses],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero
          serviciosCount={rutas.length}
          estacionesCount={estaciones.length}
          busesActivosCount={busesActivosCount}
          frecuenciaMinima={frecuenciaMinima}
        />
        <RoutesSection
          rutas={rutas}
          selectedRouteId={selectedRouteId}
          stationCountByRouteId={stationCountByRouteId}
          onSelect={setSelectedRouteId}
        />
        <ScheduleSection
          routeId={selectedRouteId}
          rutas={rutas}
          estacionesById={estacionesById}
          routeStationsByRouteId={routeStationsByRouteId}
        />
        <LiveTracking
          routeId={selectedRouteId}
          buses={busesEnVivo}
          estaciones={estaciones}
          rutas={rutas}
          routeStationsByRouteId={routeStationsByRouteId}
          lastUpdate={lastUpdatedAt}
        />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
