import { Bus } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="mt-10 bg-secondary py-12 text-secondary-foreground">
      <div className="container grid gap-8 md:grid-cols-3">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Bus className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold tracking-tight">METROPOLITANO</span>
          </div>
          <p className="max-w-sm text-sm opacity-70">
            Portal publico del corredor metropolitano de Lima para consultar rutas, recorrido de estaciones
            y estado operativo de la flota.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-xs uppercase tracking-[0.2em] opacity-60">Explora</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li><a href="#rutas" className="transition-smooth hover:opacity-100">Rutas del corredor</a></li>
            <li><a href="#horarios" className="transition-smooth hover:opacity-100">Operacion y estaciones</a></li>
            <li><a href="#en-vivo" className="transition-smooth hover:opacity-100">Buses en vivo</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-xs uppercase tracking-[0.2em] opacity-60">Acceso</h4>
          <div className="space-y-3 text-sm opacity-80">
            <p>Seguimiento operativo y herramientas internas disponibles desde el panel administrativo.</p>
            <a
              href="/admin/login"
              className="inline-flex items-center rounded-lg border border-background/20 bg-background/10 px-4 py-2 font-medium transition-smooth hover:bg-background/15"
            >
              Ir al portal admin
            </a>
          </div>
        </div>
      </div>

      <div className="container mt-10 border-t border-background/10 pt-6 text-center text-xs opacity-60">
        © {new Date().getFullYear()} Metropolitano Portal · Disenado para Lima.
      </div>
    </footer>
  );
};
