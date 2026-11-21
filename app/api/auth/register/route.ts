import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import { forwardedForHeaders } from "@/lib/client-ip";

export async function POST(req: Request) {
  const body = await req.json();
  const res = await backendFetch("/v1/auth/register", {
    method: "POST",
    headers: forwardedForHeaders(req),
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  const out = NextResponse.json(data, { status: res.status });
  
  return out;
}
