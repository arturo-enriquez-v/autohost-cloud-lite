import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { deleteStorageCredentialBackend } from "@/lib/api/backups";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAccessTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const res = await deleteStorageCredentialBackend(id, token);
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to delete credential" }, { status: res.status });
  }

  return new NextResponse(null, { status: 204 });
}
