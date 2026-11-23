// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import {
  forwardBackendError,
  revokeApiTokenBackend,
} from "@/lib/features/api-tokens/fetch/api-tokens.server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await revokeApiTokenBackend(id, accessToken);
    if (!res.ok) return forwardBackendError(res, "Failed to revoke API token");
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
