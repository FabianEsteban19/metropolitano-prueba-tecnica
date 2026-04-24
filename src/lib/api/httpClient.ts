import axios from "axios";

import { getAccessToken, handleUnauthorizedSession } from "@/lib/auth/storage";
import type { BaseResponseDto } from "@/lib/auth/types";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3002") as string;

const defaultHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export const publicApiClient = axios.create({
  baseURL: API_URL,
  headers: defaultHeaders,
});

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: defaultHeaders,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status as number | undefined;
    const requestUrl = String(error.config?.url ?? "");
    const isAuthRequest = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");
    const hasSession = Boolean(getAccessToken());

    if (status === 401 && hasSession && !isAuthRequest) {
      handleUnauthorizedSession();
    }

    return Promise.reject(error);
  },
);

export function unwrapResponseData<T>(response: { data: BaseResponseDto<T> }) {
  return response.data.data as T;
}

export function getApiErrorMessage(error: unknown, fallback = "Ocurrio un error inesperado") {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.map(String).join(", ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
