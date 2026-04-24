import type { UsuarioRol } from "@/lib/api/types";

export interface BaseResponseDto<T> {
  message: string;
  data: T | null;
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: UsuarioRol;
  createdAt: string;
  isActive: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  nombre: string;
  rol: UsuarioRol;
}

export interface AuthResponseData {
  accessToken: string;
  user: User;
}

export type AuthResponse = BaseResponseDto<AuthResponseData>;

export interface AuthActionResult {
  ok: boolean;
  error?: string;
}
