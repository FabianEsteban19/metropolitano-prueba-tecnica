import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Bus, CheckCircle2, LogIn, UserPlus } from "lucide-react";

import { USUARIO_ROLES, type UsuarioRol } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthContext";

type Mode = "login" | "register";

export function AdminAuthScreen({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = mode === "login";
  const stateFrom = (location.state as { from?: string } | null)?.from;
  const queryFrom = new URLSearchParams(location.search).get("from");
  const from = queryFrom ?? stateFrom ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<UsuarioRol>("operador");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const result = isLogin
      ? await login({ email, password })
      : await register({ email, password, nombre, rol });

    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "No se pudo completar la operacion");
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="gradient-hero relative hidden flex-col justify-between overflow-hidden p-12 text-primary-foreground lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-glow opacity-40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-accent opacity-20 blur-3xl" />

        <Link to="/" className="relative inline-flex items-center gap-2 text-sm opacity-80 transition-smooth hover:opacity-100">
          <ArrowLeft className="h-4 w-4" /> Volver al portal publico
        </Link>

        <div className="relative">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary-foreground/30 bg-primary-foreground/15 backdrop-blur">
              <Bus className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-xl font-bold tracking-tight">METROPOLITANO</div>
              <div className="text-xs uppercase tracking-[0.25em] opacity-70">Panel de gestion interna</div>
            </div>
          </div>
          <h1 className="mb-4 font-display text-4xl font-bold leading-tight xl:text-5xl">
            Monitorea tu flota,
            <br />
            controla tus reportes.
          </h1>
          <p className="max-w-md opacity-80">
            Accede al panel de gestion con autenticacion real del backend NestJS y conserva el mismo flujo del panel administrativo.
          </p>
        </div>

        <div className="relative text-xs opacity-60">© {new Date().getFullYear()} Metropolitano</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Link>
          </div>

          <h2 className="mb-2 font-display text-3xl font-bold">{isLogin ? "Iniciar sesion" : "Crear cuenta"}</h2>
          <p className="mb-8 text-sm text-muted-foreground">
            {isLogin
              ? "Ingresa tus credenciales para acceder al panel."
              : "Registra un usuario nuevo usando el endpoint real /auth/register."}
          </p>

          <div className="mb-6 flex gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div>
              <strong className="text-foreground">Backend:</strong> autenticacion conectada a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                {import.meta.env.VITE_API_URL ?? "http://localhost:3002"}
              </code>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Nombre</label>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    placeholder="Ana Flores"
                    maxLength={80}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Rol</label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={rol}
                    onChange={(event) => setRol(event.target.value as UsuarioRol)}
                  >
                    {USUARIO_ROLES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="operador@metropolitano.pe"
                maxLength={255}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Contrasena</label>
              <input
                type="password"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                minLength={6}
                maxLength={100}
                required
              />
            </div>

            {error ? (
              <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground shadow-elegant transition-smooth hover:bg-primary-glow disabled:opacity-50"
            >
              {isLogin ? (
                <>
                  <LogIn className="h-4 w-4" /> Entrar
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Crear cuenta
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <Link to={isLogin ? "/admin/register" : "/admin/login"} className="font-medium text-primary hover:underline">
              {isLogin ? "Registrate" : "Inicia sesion"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
