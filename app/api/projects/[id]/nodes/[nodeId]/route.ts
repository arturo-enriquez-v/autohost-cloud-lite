import { NextResponse } from "next/server";
import { assignNodeToProjectBackend, removeNodeFromProjectBackend } from "@/lib/features/projects/fetch/project.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, nodeId } = await params;
  const res = await assignNodeToProjectBackend(id, nodeId, accessToken);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    return NextResponse.json(err, { status: res.status });
  }
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, nodeId } = await params;
  const res = await removeNodeFromProjectBackend(id, nodeId, accessToken);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    return NextResponse.json(err, { status: res.status });
  }
  return new NextResponse(null, { status: 204 });
}
