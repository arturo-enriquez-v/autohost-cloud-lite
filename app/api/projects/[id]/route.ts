import { NextResponse } from "next/server";
import {
  getProjectBackend,
  updateProjectBackend,
  deleteProjectBackend,
} from "@/lib/features/projects/fetch/project.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const res = await getProjectBackend(id, accessToken);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let errMsg = text;
    try {
      const json = JSON.parse(text);
      errMsg = json.error || json.message || text;
    } catch {}
    return NextResponse.json({ error: errMsg.trim() || "Failed to fetch project" }, { status: res.status });
  }
  return NextResponse.json(await res.json(), { status: 200 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const res = await updateProjectBackend(id, body.name, accessToken);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let errMsg = text;
    try {
      const json = JSON.parse(text);
      errMsg = json.error || json.message || text;
    } catch {}
    return NextResponse.json({ error: errMsg.trim() || "Failed to update project" }, { status: res.status });
  }
  return NextResponse.json(await res.json(), { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const res = await deleteProjectBackend(id, accessToken);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let errMsg = text;
    try {
      const json = JSON.parse(text);
      errMsg = json.error || json.message || text;
    } catch {}
    return NextResponse.json({ error: errMsg.trim() || "Failed to delete project" }, { status: res.status });
  }
  return new NextResponse(null, { status: 204 });
}
