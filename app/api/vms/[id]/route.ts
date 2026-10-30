import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { backendFetch } from "@/lib/api";

// GET /api/vms/[id] → GET /v1/vms/{id}
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vmId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await backendFetch(`/v1/vms/${vmId}`, { method: "GET" }, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to fetch VM" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/vms/[id] → DELETE /v1/vms/{id}
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vmId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await backendFetch(`/v1/vms/${vmId}`, { method: "DELETE" }, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to delete VM" }));
      return NextResponse.json(err, { status: res.status });
    }
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
