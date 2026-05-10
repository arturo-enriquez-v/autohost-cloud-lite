import { NextResponse } from "next/server";
import {
  listScheduledTasksBackend,
  createScheduledTaskBackend,
  mapScheduledTaskFromBackend,
} from "@/lib/features/schedules/fetch/schedule.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { ScheduledTaskBackendResponse } from "@/lib/types";

// GET /api/scheduled-tasks
export async function GET() {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await listScheduledTasksBackend(accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: ScheduledTaskBackendResponse[] = await res.json();
    return NextResponse.json(data.map(mapScheduledTaskFromBackend), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/scheduled-tasks
export async function POST(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await createScheduledTaskBackend(body, accessToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data: ScheduledTaskBackendResponse = await res.json();
    return NextResponse.json(mapScheduledTaskFromBackend(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
