import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bus, LogIn, UserPlus, AlertCircle, CheckCircle2, ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

const AdminLogin = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/admin";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("admin@metropolitano.pe");
  const [password, setPassword] = useState("admin1234");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = mode === "login"
      ? await login(email, password)
      : await signup({ email, password, name });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Error desconocido");
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Lado visual */}
      <div className="hidden lg:flex relative gradient-hero text-primary-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary-glow blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-accent blur-3xl opacity-20" />

        <Link to="/" className="relative inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-smooth">
          <ArrowLeft className="w-4 h-4" /> Volver al portal público
        </Link>

        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center border border-primary-foreground/30">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display font-bold text-xl tracking-tight">METROPOLITANO</div>
              <div className="text-xs uppercase tracking-[0.25em] opacity-70">Panel de gestión interna</div>
            </div>
          </div>
          <h1 className="font-display font-bold text-4xl xl:text-5xl leading-tight mb-4">
            Monitorea tu flota,<br /> controla tus reportes.
          </h1>
          <p className="opacity-80 max-w-md">
            Accede al MVP de gestión: CRUD de buses, registro de reportes, mapa en vivo,
            historial y simulación automática.
          </p>
        </div>

        <div className="relative text-xs opacity-60">© {new Date().getFullYear()} Metropolitano · Demo MVP</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Volver
            </Link>
          </div>

          <h2 className="font-display font-bold text-3xl mb-2">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <p className="text-muted-foreground mb-8 text-sm">
            {mode === "login"
              ? "Ingresa tus credenciales para acceder al panel."
              : "Regístrate como operador del sistema."}
          </p>

          {/* Banner demo */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 mb-6 text-xs flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Demo:</strong> usa{" "}
              <code className="font-mono bg-muted px-1.5 py-0.5 rounded">admin@metropolitano.pe</code> /{" "}
              <code className="font-mono bg-muted px-1.5 py-0.5 rounded">admin1234</code>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium block mb-1.5">Nombre</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre" maxLength={80} required
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium block mb-1.5">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com" maxLength={255} required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Contraseña</label>
              <input
                type="password"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" minLength={6} maxLength={100} required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button
              type="submit" disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary-glow transition-smooth shadow-elegant disabled:opacity-50"
            >
              {mode === "login" ? <><LogIn className="w-4 h-4" /> Entrar</> : <><UserPlus className="w-4 h-4" /> Crear cuenta</>}
            </button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
              className="text-primary font-medium hover:underline"
            >
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
