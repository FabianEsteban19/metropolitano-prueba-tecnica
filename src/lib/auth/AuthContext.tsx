// ============================================================
// Auth DEMO — solo localStorage (MVP de evaluación)
// En producción reemplazar por Lovable Cloud / Supabase Auth.
// ============================================================
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const AUTH_KEY = "metropolitano_auth_v1";
const USERS_KEY = "metropolitano_users_v1";

export interface AuthUser {
  email: string;
  name: string;
  role: "admin" | "operador";
}

interface StoredUser extends AuthUser { passwordHash: string; }

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (data: { email: string; password: string; name: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// hash trivial — SOLO DEMO, no usar en producción
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  // sembrar admin demo
  const seed: StoredUser[] = [
    { email: "admin@metropolitano.pe", name: "Admin Demo", role: "admin", passwordHash: hash("admin1234") },
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(seed));
  return seed;
}

function saveUsers(u: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch { /* */ }
    setLoading(false);
  }, []);

  const login: AuthContextValue["login"] = async (email, password) => {
    const users = loadUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!found) return { ok: false, error: "Usuario no encontrado" };
    if (found.passwordHash !== hash(password)) return { ok: false, error: "Contraseña incorrecta" };
    const u: AuthUser = { email: found.email, name: found.name, role: found.role };
    localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    setUser(u);
    return { ok: true };
  };

  const signup: AuthContextValue["signup"] = async ({ email, password, name }) => {
    if (!email.includes("@")) return { ok: false, error: "Email inválido" };
    if (password.length < 6) return { ok: false, error: "La contraseña debe tener al menos 6 caracteres" };
    if (name.trim().length < 2) return { ok: false, error: "Nombre inválido" };
    const users = loadUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase().trim()))
      return { ok: false, error: "Ya existe una cuenta con ese email" };
    const newUser: StoredUser = { email: email.trim(), name: name.trim(), role: "operador", passwordHash: hash(password) };
    saveUsers([...users, newUser]);
    const u: AuthUser = { email: newUser.email, name: newUser.name, role: newUser.role };
    localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    setUser(u);
    return { ok: true };
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
