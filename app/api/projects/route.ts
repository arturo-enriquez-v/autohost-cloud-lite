import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { createProjectBackend, getProjectsBackend } from "@/lib/features/projects/api";

export async function GET() {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await getProjectsBackend(accessToken);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    return NextResponse.json(err, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data ?? [], { status: 200 });
}

export async function POST(request: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const res = await createProjectBackend(body.name, accessToken);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    return NextResponse.json(err, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
