import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import { getAccessTokenFromCookie } from "@/lib/cookies";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_request: Request, { params }: Ctx) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, userId } = await params;
  const res = await backendFetch(
    `/v1/projects/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
    accessToken
  );
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const text = await res.text().catch(() => "");
  return NextResponse.json({ error: text.trim() || "Failed to remove member" }, { status: res.status });
}
