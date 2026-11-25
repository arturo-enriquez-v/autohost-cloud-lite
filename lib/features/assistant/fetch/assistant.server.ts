// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { createSSEProxyStream } from "@/lib/api/sse";
import { forwardBackendError } from "@/lib/features/api-tokens/fetch/api-tokens.server";
import { API_ASSISTANT_ENDPOINTS as EP } from "./constants";

/** Forwards a JSON call to the API: body and status on success, {"error"} on failure. */
export async function proxyAssistantJSON(path: string, init: RequestInit, fallback: string) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const res = await backendFetch(path, init, accessToken);
    if (!res.ok) return forwardBackendError(res, fallback);
    return NextResponse.json(await res.json(), { status: res.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Starts a chat turn and streams it back. Errors before the stream starts (disabled assistant, rate
 * limit) come back as JSON with their status.
 */
export async function proxyAssistantChat(req: Request): Promise<Response> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.text();
  let upstream: Response;
  try {
    upstream = await backendFetch(
      EP.CHAT,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body,
        cache: "no-store",
        signal: req.signal,
      },
      accessToken
    );
  } catch {
    return NextResponse.json({ error: "API unreachable" }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) return forwardBackendError(upstream, "Chat failed");
  return new Response(createSSEProxyStream(upstream.body, req.signal), {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export { EP as API_ASSISTANT_ENDPOINTS };
