import { API_ENDPOINTS } from "@/config/constants";
import type { LoginRequest, RegisterRequest, AuthResponse } from "@/lib/types";
import { backendFetch } from "../api";

/**
 * Realiza login en el backend
 */
export async function loginBackend(data: LoginRequest) {
  return backendFetch(API_ENDPOINTS.AUTH.LOGIN, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Realiza registro en el backend
 */
export async function registerBackend(data: RegisterRequest) {
  return backendFetch(API_ENDPOINTS.AUTH.REGISTER, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Cierra sesión en el backend — envía el refresh_token para revocación
 */
export async function logoutBackend(accessToken: string, refreshToken?: string) {
  return backendFetch(API_ENDPOINTS.AUTH.LOGOUT, {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken ?? "" }),
  }, accessToken);
}

/**
 * Obtiene información del usuario actual
 */
export async function getMeBackend(accessToken: string) {
  return backendFetch(API_ENDPOINTS.AUTH.ME, {
    method: "GET",
  }, accessToken);
}

/**
 * Refresca el access token
 */
export async function refreshTokenBackend() {
  return backendFetch(API_ENDPOINTS.AUTH.REFRESH, {
    method: "POST",
  });
}
