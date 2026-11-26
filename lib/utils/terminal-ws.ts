// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

/** Host names that only make sense inside the server's network (Docker service names, loopback). */
function isInternalHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === "localhost" || h === "api" || h === "0.0.0.0" || h.startsWith("127.") || h.endsWith(".internal")
}

/**
 * Base URL (ws[s]://host:port) for the node terminal WebSocket, which the browser opens straight to the
 * API (Next route handlers cannot proxy WebSockets).
 *
 * - Panel served over HTTPS (a domain) and a public HTTPS API URL: use the API's own domain, since the
 *   panel's domain only serves the panel.
 * - Otherwise (LAN, VPN or IP access): the host the panel was loaded from, on port 8080 when the panel is
 *   on 3000 (or the API URL's port), as before.
 */
export function terminalWebSocketBase(
  location: { protocol: string; hostname: string; port: string },
  apiUrl?: string
): string {
  const pageHttps = location.protocol === "https:"
  let api: URL | null = null
  try {
    api = apiUrl ? new URL(apiUrl) : null
  } catch {
    api = null
  }

  if (pageHttps && api && api.protocol === "https:" && !isInternalHost(api.hostname)) {
    return `wss://${api.host}`
  }

  const proto = pageHttps ? "wss:" : "ws:"
  let port = location.port === "3000" ? "8080" : location.port || (pageHttps ? "443" : "80")
  if (api?.port && location.port === "3000") port = api.port
  return `${proto}//${location.hostname}:${port}`
}
