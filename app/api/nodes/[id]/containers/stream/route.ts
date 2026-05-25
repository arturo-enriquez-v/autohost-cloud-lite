import { getAccessTokenFromCookie } from "@/lib/cookies";
import { backendFetch } from "@/lib/api";
import { createSSEProxyStream } from "@/lib/api/sse";

export const dynamic = "force-dynamic";

/**
 * GET /api/nodes/[id]/containers/stream
 *
 * Proxies the Go backend SSE endpoint that streams real-time Docker container
 * list snapshots from the node agent via gRPC → Server-Sent Events.
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

  let upstream: Response;
  try {
    upstream = await backendFetch(
      `/v1/node-containers/${nodeId}/stream`,
      {
        cache: "no-store",
        signal: req.signal,
        // @ts-expect-error — Node.js fetch supports duplex half for streaming
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

  return new Response(createSSEProxyStream(upstream.body, req.signal), {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
