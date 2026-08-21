import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { createProjectBackend, getProjectsBackend } from "@/lib/features/projects/fetch/project.server";

export async function GET() {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await getProjectsBackend(accessToken);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let errMsg = text;
    try {
      const json = JSON.parse(text);
      errMsg = json.error || json.message || text;
    } catch {}
    return NextResponse.json({ error: errMsg.trim() || "Failed to fetch projects" }, { status: res.status });
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
    const text = await res.text().catch(() => "");
    let errMsg = text;
    try {
      const json = JSON.parse(text);
      errMsg = json.error || json.message || text;
    } catch {}
    return NextResponse.json({ error: errMsg.trim() || "Failed to create project" }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
