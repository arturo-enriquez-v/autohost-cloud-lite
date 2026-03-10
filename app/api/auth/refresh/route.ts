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

  const res = await backendFetch("/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.access_token) {
    // Refresh falló — limpiar cookies y forzar re-login
    const response = NextResponse.json(
      { error: "Session expired" },
      { status: 401 }
    );
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(ACCESS_COOKIE, data.access_token, ACCESS_COOKIE_OPTIONS);

  if (data.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, data.refresh_token, REFRESH_COOKIE_OPTIONS);
  }

  return response;
}
