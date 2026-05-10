import { NextResponse } from "next/server";
import {
  updateScheduledTaskBackend,
  deleteScheduledTaskBackend,
  mapScheduledTaskFromBackend,
} from "@/lib/features/schedules/fetch/schedule.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { ScheduledTaskBackendResponse } from "@/lib/types";

// PUT /api/scheduled-tasks/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await updateScheduledTaskBackend(id, body, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: ScheduledTaskBackendResponse = await res.json();
    return NextResponse.json(mapScheduledTaskFromBackend(data), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/scheduled-tasks/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await deleteScheduledTaskBackend(id, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
