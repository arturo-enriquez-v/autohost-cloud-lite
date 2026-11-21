/**
 * Builds the header that forwards the browser's IP to the Go API.
 *
 * The API only honors X-Forwarded-For from trusted proxies (TRUSTED_PROXIES, by default loopback and
 * private ranges such as the Docker network this server runs in). Forwarding it lets the API apply
 * per-client rate limits and record the real IP on sessions instead of seeing this server's address.
 *
 * If this Next.js server is exposed directly (no reverse proxy in front), the incoming header is
 * client-controlled; the API's per-account and per-share limits still apply in that case.
 */
export function forwardedForHeaders(req: Request): Record<string, string> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "";
  return ip ? { "X-Forwarded-For": ip } : {};
}
