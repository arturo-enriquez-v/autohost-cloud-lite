import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { approveDiagnosticBackend } from "@/lib/features/diagnostics/fetch/diagnostics.server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const res = await approveDiagnosticBackend(id, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to approve diagnostic" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[API] approve diagnostic error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
