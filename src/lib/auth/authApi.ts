import { apiClient, unwrapResponseData } from "@/lib/api/httpClient";

import type { AuthResponseData, LoginDto, RegisterDto } from "./types";

export const authApi = {
  async login(payload: LoginDto) {
    const response = await apiClient.post("/auth/login", payload);
    return unwrapResponseData<AuthResponseData>(response);
  },

  async register(payload: RegisterDto) {
    const response = await apiClient.post("/auth/register", payload);
    return unwrapResponseData<AuthResponseData>(response);
  },
};
