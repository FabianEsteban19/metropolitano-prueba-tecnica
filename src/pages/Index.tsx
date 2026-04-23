import { useState } from "react";
import { Header } from "@/components/metropolitano/Header";
import { Hero } from "@/components/metropolitano/Hero";
import { RoutesSection } from "@/components/metropolitano/RoutesSection";
import { ScheduleSection } from "@/components/metropolitano/ScheduleSection";
import { LiveTracking } from "@/components/metropolitano/LiveTracking";
import { Footer } from "@/components/metropolitano/Footer";

const Index = () => {
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(1);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <RoutesSection selectedRouteId={selectedRouteId} onSelect={setSelectedRouteId} />
        <ScheduleSection routeId={selectedRouteId} />
        <LiveTracking routeId={selectedRouteId} />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
