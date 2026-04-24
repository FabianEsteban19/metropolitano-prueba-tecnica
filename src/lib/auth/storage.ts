import type { User } from "./types";

export const AUTH_USER_KEY = "metropolitano_auth_v2";
export const AUTH_TOKEN_KEY = "metropolitano_token";
export const AUTH_LOGOUT_EVENT = "metropolitano:auth-logout";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveAuthSession(accessToken: string, user: User) {
  if (!isBrowser()) return;

  window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession(options?: { notify?: boolean }) {
  if (!isBrowser()) return;

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);

  if (options?.notify !== false) {
    window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
  }
}

export function isAuthPath(pathname: string) {
  return pathname.startsWith("/admin/login") || pathname.startsWith("/admin/register");
}

export function redirectToLogin() {
  if (!isBrowser()) return;
  if (isAuthPath(window.location.pathname)) return;

  const from = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/admin/login?from=${encodeURIComponent(from)}`);
}

export function handleUnauthorizedSession() {
  clearAuthSession();
  redirectToLogin();
}
