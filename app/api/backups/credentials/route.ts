import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { createStorageCredentialBackend, fetchStorageCredentials } from "@/lib/api/backups";

export async function GET() {
  const token = await getAccessTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creds = await fetchStorageCredentials(token);
  return NextResponse.json(creds, { status: 200 });
}

export async function POST(req: Request) {
  const token = await getAccessTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const res = await createStorageCredentialBackend(body, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create credential" }));
    return NextResponse.json(err, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
