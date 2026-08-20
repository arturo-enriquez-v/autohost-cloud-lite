import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { collectDiagnosticBackend } from "@/lib/features/diagnostics/fetch/diagnostics.server";

export async function POST(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await collectDiagnosticBackend(body, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to collect diagnostics" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[API] collect diagnostics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
