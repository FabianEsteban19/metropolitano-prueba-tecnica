import { Bus as BusIcon, Clock, MapPin, Activity } from "lucide-react";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/85 border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <a href="#top" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-elegant">
              <BusIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-success border-2 border-background pulse-live" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-lg tracking-tight">METROPOLITANO</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Lima · Portal en vivo</div>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          <a href="#rutas" className="px-3 py-2 rounded-md hover:bg-muted transition-smooth flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Rutas
          </a>
          <a href="#horarios" className="px-3 py-2 rounded-md hover:bg-muted transition-smooth flex items-center gap-2">
            <Clock className="w-4 h-4" /> Horarios
          </a>
          <a href="#en-vivo" className="px-3 py-2 rounded-md hover:bg-muted transition-smooth flex items-center gap-2">
            <Activity className="w-4 h-4" /> En vivo
          </a>
        </nav>

        <a
          href="#en-vivo"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-glow transition-smooth shadow-elegant"
        >
          <span className="w-2 h-2 rounded-full bg-background animate-pulse" />
          Ver buses ahora
        </a>
      </div>
    </header>
  );
};
