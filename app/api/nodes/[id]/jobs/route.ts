import { NextResponse } from "next/server";
import { getJobsByNodeBackend, dispatchJobBackend, mapJobFromBackend } from "@/lib/api/jobs";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { JobBackendResponse } from "@/lib/types";

// GET /api/nodes/[id]/jobs — list jobs for a node
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await getJobsByNodeBackend(nodeId, accessToken);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const backendJobs: JobBackendResponse[] | null = await res.json();
    if (!backendJobs || !Array.isArray(backendJobs)) {
      return NextResponse.json([], { status: 200 });
    }

    const jobs = backendJobs.map(mapJobFromBackend);
    return NextResponse.json(jobs, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/nodes/[id]/jobs — dispatch a job to a node
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { commandName, commandType } = body;

    if (!commandName) {
      return NextResponse.json({ error: "commandName is required" }, { status: 400 });
    }

    const res = await dispatchJobBackend(nodeId, commandName, commandType || "custom", accessToken);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const backendJob: JobBackendResponse = await res.json();
    const job = mapJobFromBackend(backendJob);
    return NextResponse.json(job, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
