import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import { getAccessTokenFromCookie } from "@/lib/cookies";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const res = await backendFetch(`/v1/projects/${encodeURIComponent(id)}/members`, { method: "GET" }, accessToken);
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { error?: string })?.error || "Failed to fetch project members" },
      { status: res.status }
    );
  }
  return NextResponse.json(data ?? [], { status: 200 });
}

export async function POST(request: Request, { params }: Ctx) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.text();
  const res = await backendFetch(
    `/v1/projects/${encodeURIComponent(id)}/members`,
    { method: "POST", body },
    accessToken
  );

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const text = await res.text().catch(() => "");
  let msg = text.trim();
  try {
    const j = JSON.parse(text);
    msg = j.error || j.message || msg;
  } catch {}
  return NextResponse.json({ error: msg || "Failed to assign project member" }, { status: res.status });
}
