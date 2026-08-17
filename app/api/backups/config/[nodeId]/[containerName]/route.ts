import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { fetchBackupConfig, upsertBackupConfigBackend } from "@/lib/api/backups";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ nodeId: string; containerName: string }> }
) {
  const token = await getAccessTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nodeId, containerName } = await params;
  const cfg = await fetchBackupConfig(nodeId, containerName, token);
  return NextResponse.json(cfg ?? { enabled: false }, { status: 200 });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ nodeId: string; containerName: string }> }
) {
  const token = await getAccessTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nodeId, containerName } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const res = await upsertBackupConfigBackend(nodeId, containerName, body, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update backup config" }));
    return NextResponse.json(err, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: 200 });
}
