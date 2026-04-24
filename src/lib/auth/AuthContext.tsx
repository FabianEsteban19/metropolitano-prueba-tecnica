import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getApiErrorMessage } from "@/lib/api/httpClient";

import { authApi } from "./authApi";
import {
  AUTH_LOGOUT_EVENT,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  saveAuthSession,
} from "./storage";
import type { AuthActionResult, LoginDto, RegisterDto, User } from "./types";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: LoginDto) => Promise<AuthActionResult>;
  register: (payload: RegisterDto) => Promise<AuthActionResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setAccessToken(getAccessToken());
    setLoading(false);

    const syncSession = () => {
      setUser(getStoredUser());
      setAccessToken(getAccessToken());
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === AUTH_USER_KEY || event.key === AUTH_TOKEN_KEY) {
        syncSession();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_LOGOUT_EVENT, syncSession);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_LOGOUT_EVENT, syncSession);
    };
  }, []);

  const login = async (payload: LoginDto): Promise<AuthActionResult> => {
    try {
      const session = await authApi.login(payload);
      saveAuthSession(session.accessToken, session.user);
      setUser(session.user);
      setAccessToken(session.accessToken);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: getApiErrorMessage(error, "No se pudo iniciar sesion") };
    }
  };

  const register = async (payload: RegisterDto): Promise<AuthActionResult> => {
    try {
      const session = await authApi.register(payload);
      saveAuthSession(session.accessToken, session.user);
      setUser(session.user);
      setAccessToken(session.accessToken);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: getApiErrorMessage(error, "No se pudo crear la cuenta") };
    }
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
    setAccessToken(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      loading,
      login,
      register,
      logout,
    }),
    [accessToken, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
