import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { revokeExternalLogTokenBackend } from "@/lib/features/external_logs/fetch/external_logs.server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Token ID required" }, { status: 400 });
  }

  try {
    const res = await revokeExternalLogTokenBackend(accessToken, id);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to revoke token" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
