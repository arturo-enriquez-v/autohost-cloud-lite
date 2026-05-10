import { NextResponse } from "next/server";
import { toggleScheduledTaskBackend, mapScheduledTaskFromBackend } from "@/lib/features/schedules/fetch/schedule.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { ScheduledTaskBackendResponse } from "@/lib/types";

// PATCH /api/scheduled-tasks/[id]/toggle
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await toggleScheduledTaskBackend(id, accessToken);
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
