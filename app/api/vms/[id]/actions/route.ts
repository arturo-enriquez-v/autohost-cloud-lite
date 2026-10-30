import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { backendFetch } from "@/lib/api";

// POST /api/vms/[id]/actions → POST /v1/vms/{id}/actions
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vmId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await backendFetch(
      `/v1/vms/${vmId}/actions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      accessToken
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to perform VM action" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
