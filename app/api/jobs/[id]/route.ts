import { NextResponse } from "next/server";
import { getJobBackend, mapJobFromBackend } from "@/lib/api/jobs";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { JobBackendResponse } from "@/lib/types";

// GET /api/jobs/[id] — get a single job by ID (for polling status)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await getJobBackend(jobId, accessToken);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const backendJob: JobBackendResponse = await res.json();
    const job = mapJobFromBackend(backendJob);
    return NextResponse.json(job, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
