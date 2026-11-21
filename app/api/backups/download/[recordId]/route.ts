import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { downloadBackupBackend } from "@/lib/api/backups";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const token = await getAccessTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recordId } = await params;
  const res = await downloadBackupBackend(recordId, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to generate download URL" }));
    return NextResponse.json(err, { status: res.status });
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType || "application/octet-stream");
  const disposition = res.headers.get("content-disposition");
  if (disposition) headers.set("Content-Disposition", disposition);
  const contentLength = res.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(res.body, {
    status: 200,
    headers,
  });
}
