import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { fetchBackupRecords } from "@/lib/api/backups";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ nodeId: string; containerName: string }> }
) {
  const token = await getAccessTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nodeId, containerName } = await params;
  const records = await fetchBackupRecords(nodeId, containerName, token);
  return NextResponse.json(records, { status: 200 });
}
