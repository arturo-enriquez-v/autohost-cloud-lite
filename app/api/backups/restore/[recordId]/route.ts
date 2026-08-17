import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { restoreBackupBackend } from "@/lib/api/backups";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const token = await getAccessTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recordId } = await params;
  const res = await restoreBackupBackend(recordId, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to trigger restore" }));
    return NextResponse.json(err, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: 200 });
}
