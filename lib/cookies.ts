import { cookies } from "next/headers";

export const ACCESS_COOKIE  = "access_token";
export const REFRESH_COOKIE = "refresh_token";

// Secure solo si se define explícitamente COOKIE_SECURE=true
// NODE_ENV=production no implica HTTPS (ej: Docker en red local sin TLS)
const SECURE = process.env.COOKIE_SECURE === "true";

type CookieOptions = {
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
  secure?: boolean;
  path?: string;
  maxAge?: number;
};

/** Opciones para el access_token (vida corta) */
export const ACCESS_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure:   SECURE,
  path:     "/",
  maxAge:   60 * 60, // 1 hora
};

/** Opciones para el refresh_token (vida larga) */
export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure:   SECURE,
  path:     "/",
  maxAge:   60 * 60 * 24 * 30, // 30 días
};

// --- Leer cookies (server-side: Route Handlers y Server Components) ---

export async function getAccessTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}
