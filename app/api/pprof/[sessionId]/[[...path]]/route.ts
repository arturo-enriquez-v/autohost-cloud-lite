import { backendFetch } from "@/lib/api";
import { getAccessTokenFromCookie } from "@/lib/cookies";

export const dynamic = "force-dynamic";

/**
 * GET /api/pprof/[sessionId]/[...path]
 * GET /api/pprof/[sessionId]
 *
 * Transparent reverse-proxy to the Go API's pprof UI session.
 * The Go backend already rewrites absolute-path references in HTML/JS,
 * so Next.js just needs to forward bytes + headers unchanged.
 *
 * The iframe src should be:  /api/pprof/{sessionId}/ui/
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string; path?: string[] }> }
) {
  const { sessionId, path = [] } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Rebuild the backend path:  /v1/pprof/{sessionId}/{...rest}
  const suffix = path.length > 0 ? "/" + path.join("/") : "";
  const backendPath = `/v1/pprof/${sessionId}${suffix}`;

  // Forward query string too (pprof uses ?si=, ?g=, etc.)
  const url = new URL(req.url);
  const backendUrl = backendPath + (url.search || "");

  let upstream: Response;
  try {
    upstream = await backendFetch(
      backendUrl,
      {
        cache: "no-store",
        signal: req.signal,
      },
      accessToken
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return new Response("Cancelled", { status: 499 });
    }
    return new Response("pprof proxy error", { status: 502 });
  }

  // Stream body back to the browser, copying relevant response headers.
  const headers = new Headers();
  const forwardHeaders = [
    "content-type",
    "content-length",
    "cache-control",
    "etag",
    "last-modified",
    "transfer-encoding",
  ];
  for (const h of forwardHeaders) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
