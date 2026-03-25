import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch } from "@/lib/api";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_OPTIONS,
} from "@/lib/cookies";

/**
 * GET /api/auth/google/callback
 * Google redirige aquí con ?code=...&state=...
 * Intercambia el code por tokens, los envía al backend Go, setea cookies JWT y redirige al dashboard.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // User denied access or error from Google
  if (errorParam || !code) {
    return NextResponse.redirect(new URL("/login?error=google_denied", url.origin));
  }

  // CSRF: verify state matches cookie
  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", url.origin));
  }

  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Exchange authorization code for tokens with Google
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json().catch(() => ({}));
  if (!tokens.id_token) {
    return NextResponse.redirect(new URL("/login?error=google_failed", url.origin));
  }

  // Send id_token to our Go backend for verification + user creation
  const backendRes = await backendFetch("/v1/auth/oauth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: tokens.id_token }),
  });

  const data = await backendRes.json().catch(() => ({}));
  if (!backendRes.ok || !data.access_token) {
    return NextResponse.redirect(new URL("/login?error=google_failed", url.origin));
  }

  // Set JWT cookies and redirect to dashboard
  const response = NextResponse.redirect(new URL("/", url.origin));
  response.cookies.set(ACCESS_COOKIE, data.access_token, ACCESS_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_COOKIE, data.refresh_token, REFRESH_COOKIE_OPTIONS);
  response.cookies.delete("oauth_state");

  return response;
}
