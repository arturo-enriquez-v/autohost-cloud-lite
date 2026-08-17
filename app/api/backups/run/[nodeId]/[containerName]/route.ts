import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { runManualBackupBackend } from "@/lib/api/backups";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ nodeId: string; containerName: string }> }
) {
  const token = await getAccessTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nodeId, containerName } = await params;
  const res = await runManualBackupBackend(nodeId, containerName, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to trigger backup" }));
    return NextResponse.json(err, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: 200 });
}
