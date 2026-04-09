import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json();
  const res = await backendFetch("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  console.log("[REGISTER] Response status:", res.status);
  console.log("[REGISTER] Has access_token:", !!data?.access_token);

  const out = NextResponse.json(data, { status: res.status });
  
  return out;
}
