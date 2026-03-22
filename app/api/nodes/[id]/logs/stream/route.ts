import { getAccessTokenFromCookie } from "@/lib/cookies";
import { backendFetch } from "@/lib/api";

// This route must never be statically cached.
export const dynamic = "force-dynamic";

/**
 * GET /api/nodes/[id]/logs/stream
 *
 * Proxies the Go backend SSE endpoint that streams real-time logs from the
 * node agent via gRPC → Server-Sent Events.
 *
 * Query params forwarded to backend:
 *   unit  — systemd unit name (empty = all units)
 *   lines — how many historical lines to tail first (default 100)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Forward optional query params.
  const { searchParams } = new URL(req.url);
  const unit = searchParams.get("unit") ?? "";
  const lines = searchParams.get("lines") ?? "100";

  const qs = new URLSearchParams();
  if (unit) qs.set("unit", unit);
  qs.set("lines", lines);

  let upstream: Response;
  try {
    upstream = await backendFetch(
      `/v1/node-logs/${nodeId}/stream?${qs.toString()}`,
      {
        // Tell fetch to not buffer the body.
        cache: "no-store",
        // @ts-expect-error — Node.js fetch supports this signal: makes the
        // stream abort when the client disconnects.
        duplex: "half",
      },
      accessToken
    );
  } catch {
    return new Response("Backend unreachable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Backend error", { status: upstream.status });
  }

  // Stream the SSE response straight through to the browser.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
