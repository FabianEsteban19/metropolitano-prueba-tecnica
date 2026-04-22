import { Bus } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-12 mt-10">
      <div className="container grid md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Bus className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold tracking-tight">METROPOLITANO</span>
          </div>
          <p className="text-sm opacity-70 max-w-sm">
            Portal demostrativo del sistema BRT de Lima, Perú. Listo para integrarse con
            endpoints reales del operador.
          </p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] mb-3 opacity-60">Endpoints listos</h4>
          <ul className="space-y-1.5 text-sm font-mono opacity-80">
            <li>GET /routes</li>
            <li>GET /stations</li>
            <li>GET /buses</li>
            <li>GET /schedules/:route/:station</li>
            <li>WS  /buses (live)</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] mb-3 opacity-60">Configuración</h4>
          <p className="text-sm opacity-70 mb-2">Define en tu entorno:</p>
          <code className="block text-xs bg-background/10 rounded-lg p-3 font-mono">
            VITE_METROPOLITANO_API_URL<br />
            VITE_METROPOLITANO_WS_URL
          </code>
        </div>
      </div>
      <div className="container mt-10 pt-6 border-t border-background/10 text-xs opacity-60 text-center">
        © {new Date().getFullYear()} Metropolitano Portal · Diseñado para Lima.
      </div>
    </footer>
  );
};
