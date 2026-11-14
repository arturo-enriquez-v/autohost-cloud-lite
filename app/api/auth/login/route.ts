import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_OPTIONS,
} from "@/lib/cookies";
import { loginBackend } from "@/lib/features/auth/fech/api";

export async function POST(req: Request) {
  const body = await req.json();

  let res: Response;
  try {
    res = await loginBackend(body);
  } catch (err) {
    console.error("[AUTH] Error connecting to backend API:", err);
    return NextResponse.json(
      { error: "No se pudo conectar con el servidor backend. Asegúrate de que el backend esté en ejecución." },
      { status: 503 }
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.access_token) {
    return NextResponse.json(
      { error: data.error ?? "Invalid credentials" },
      { status: res.status }
    );
  }

  // Next.js es el único dueño de las cookies — Go no setea nada
  const response = NextResponse.json({ ok: true }, { status: 200 });

  response.cookies.set(ACCESS_COOKIE,  data.access_token,  ACCESS_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_COOKIE, data.refresh_token, REFRESH_COOKIE_OPTIONS);

  return response;
}
