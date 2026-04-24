import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_OPTIONS,
  getRefreshTokenFromCookie,
} from "@/lib/cookies";

export async function POST() {
  const refreshToken = await getRefreshTokenFromCookie();

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  let res: Response;
  try {
    res = await backendFetch("/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    // Error de red transitorio — no borrar cookies, el cliente reintentará
    return NextResponse.json({ error: "Backend unreachable" }, { status: 503 });
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.access_token) {
    // Solo borrar cookies si el backend confirma que el token es inválido (401/403)
    // Para errores 5xx (backend caído), conservar las cookies para poder reintentar
    if (res.status === 401 || res.status === 403) {
      const response = NextResponse.json(
        { error: "Session expired" },
        { status: 401 }
      );
      response.cookies.delete(ACCESS_COOKIE);
      response.cookies.delete(REFRESH_COOKIE);
      return response;
    }
    return NextResponse.json({ error: "Refresh failed" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(ACCESS_COOKIE, data.access_token, ACCESS_COOKIE_OPTIONS);

  if (data.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, data.refresh_token, REFRESH_COOKIE_OPTIONS);
  }

  return response;
}
