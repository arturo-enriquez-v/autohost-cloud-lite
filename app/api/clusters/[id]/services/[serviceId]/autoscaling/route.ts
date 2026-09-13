import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { configureAutoscalingBackend } from "@/lib/features/clusters/fetch/cluster.server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  const { id, serviceId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const res = await configureAutoscalingBackend(id, serviceId, body, accessToken);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || "Failed to configure autoscaling" }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data, { status: 200 });
}
