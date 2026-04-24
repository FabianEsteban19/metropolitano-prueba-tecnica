import { ArrowRight, Bus, MapPin, Activity } from "lucide-react";

interface Props {
  serviciosCount: number;
  estacionesCount: number;
  busesActivosCount: number;
  frecuenciaMinima: number | null;
}

export const Hero = ({
  serviciosCount,
  estacionesCount,
  busesActivosCount,
  frecuenciaMinima,
}: Props) => {
  return (
    <section id="top" className="relative overflow-hidden gradient-hero text-primary-foreground">
      <div className="absolute inset-0 opacity-20" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary-glow blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-accent blur-3xl opacity-30" />
      </div>

      <div className="container relative py-20 md:py-28 lg:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 text-xs font-medium backdrop-blur-sm mb-6 fade-in-up">
            <span className="w-2 h-2 rounded-full bg-success pulse-live" />
            Sistema operativo · {estacionesCount} estaciones · {serviciosCount} servicios
          </div>

          <h1 className="font-display font-bold text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-6 fade-in-up">
            Tu corredor de Lima,
            <br />
            <span className="text-accent">en tiempo real.</span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/85 max-w-2xl mb-10 fade-in-up" style={{ animationDelay: "0.1s" }}>
            Consulta rutas, estaciones, estado operativo de buses y rastrea cada unidad del Metropolitano
            mientras avanza por el corredor principal.
          </p>

          <div className="flex flex-wrap gap-3 fade-in-up" style={{ animationDelay: "0.2s" }}>
            <a
              href="#en-vivo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-foreground text-primary font-semibold hover:bg-accent hover:text-accent-foreground transition-smooth shadow-elegant"
            >
              Ver buses en vivo <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#rutas"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-primary-foreground/40 hover:bg-primary-foreground/10 font-semibold transition-smooth"
            >
              Explorar rutas
            </a>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-16 max-w-xl fade-in-up" style={{ animationDelay: "0.3s" }}>
            {[
              { icon: Bus, label: "Buses activos", value: String(busesActivosCount) },
              { icon: MapPin, label: "Estaciones", value: String(estacionesCount) },
              { icon: Activity, label: "Frecuencia min.", value: frecuenciaMinima != null ? `${frecuenciaMinima} min` : "-" },
            ].map((s) => (
              <div key={s.label} className="border-l-2 border-primary-foreground/30 pl-4">
                <s.icon className="w-5 h-5 mb-2 text-accent" />
                <div className="font-display text-2xl font-bold">{s.value}</div>
                <div className="text-xs uppercase tracking-wider text-primary-foreground/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
