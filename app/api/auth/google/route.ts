import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_OPTIONS,
} from "@/lib/cookies";

const SECURE = process.env.COOKIE_SECURE === "true";

/**
 * GET /api/auth/google → redirect to Google OAuth consent screen
 */
export async function GET(req: Request) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth not configured" },
      { status: 500 }
    );
  }

  const appUrl = process.env.APP_URL ?? new URL(req.url).origin;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  // CSRF protection: random state stored in cookie
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state,
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );

  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE,
    path: "/",
    maxAge: 300,
  });

  return response;
}

/**
 * POST /api/auth/google → receive id_token directly (for GSI / programmatic flows)
 */
export async function POST(req: Request) {
  const body = await req.json();

  const res = await backendFetch("/v1/auth/oauth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: body.id_token }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.access_token) {
    return NextResponse.json(
      { error: data.error ?? "Google login failed" },
      { status: res.status }
    );
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(ACCESS_COOKIE, data.access_token, ACCESS_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_COOKIE, data.refresh_token, REFRESH_COOKIE_OPTIONS);

  return response;
}
