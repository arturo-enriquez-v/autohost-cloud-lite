// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import {
  createApiTokenBackend,
  forwardBackendError,
  listApiTokensBackend,
} from "@/lib/features/api-tokens/fetch/api-tokens.server";

export async function GET() {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await listApiTokensBackend(accessToken);
    if (!res.ok) return forwardBackendError(res, "Failed to load API tokens");
    return NextResponse.json(await res.json(), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid json body" }, { status: 400 });

  try {
    const res = await createApiTokenBackend(body, accessToken);
    if (!res.ok) return forwardBackendError(res, "Failed to create API token");
    // The response carries the raw token: make sure no cache keeps it.
    return NextResponse.json(await res.json(), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
