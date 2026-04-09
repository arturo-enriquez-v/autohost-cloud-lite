import { NextResponse } from "next/server";
import { logoutBackend } from "@/lib/api/auth";
import { ACCESS_COOKIE, REFRESH_COOKIE, getAccessTokenFromCookie, getRefreshTokenFromCookie } from "@/lib/cookies";

export async function POST() {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessTokenFromCookie(),
    getRefreshTokenFromCookie(),
  ]);

  // Notificar al backend para invalidar el refresh_token (revocación)
  if (accessToken) {
    await logoutBackend(accessToken, refreshToken ?? undefined).catch(() => {});
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
