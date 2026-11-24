// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Cloud, ExternalLink, Loader2, Radio, Settings2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchWithAuth } from "@/lib/api/fetch-client"
import type { CloudflareTunnelStatus } from "@/components/features/nodes/CloudflareTunnelCard"
import type { TailscaleFunnelRoute } from "@/components/features/nodes/TailscaleFunnelCard"

interface PublicRoute {
  kind: "cloudflare" | "funnel"
  url: string
  target: string
  container?: string
}

async function loadJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetchWithAuth(path, { method: "GET" })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

/**
 * Read-only list of the Cloudflare Tunnel and Tailscale Funnel routes that point to one node. The tunnels
 * themselves are global and are managed in Networking → Proxy.
 */
export function NodePublicRoutesCard({ nodeId }: { nodeId: string }) {
  const [routes, setRoutes] = useState<PublicRoute[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [cf, funnel] = await Promise.all([
      loadJSON<CloudflareTunnelStatus>("/api/cloudflare-tunnel"),
      loadJSON<{ routes?: TailscaleFunnelRoute[] }>("/api/tailscale-funnel"),
    ])
    const next: PublicRoute[] = [
      ...(cf?.routes ?? [])
        .filter((r) => r.target_node_id === nodeId)
        .map((r) => ({
          kind: "cloudflare" as const,
          url: `https://${r.domain}`,
          target: r.upstream || `${r.target_ip}:${r.port}`,
          container: r.container_name,
        })),
      ...(funnel?.routes ?? [])
        .filter((r) => r.target_node_id === nodeId)
        .map((r) => ({
          kind: "funnel" as const,
          url: r.public_url,
          target: r.upstream || `${r.target_ip}:${r.container_port}`,
          container: r.container_name,
        })),
    ]
    setRoutes(next)
    setLoading(false)
  }, [nodeId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Public routes to this node</CardTitle>
          <CardDescription className="text-xs">
            Cloudflare Tunnel and Tailscale Funnel routes that reach services on this node.
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
          <Link href={`/networking/proxy?node=${encodeURIComponent(nodeId)}`}>
            <Settings2 className="h-4 w-4" />
            Manage tunnels
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading routes…
          </div>
        ) : routes.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No public routes point to this node yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {routes.map((r) => (
              <li key={`${r.kind}:${r.url}`} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground sm:w-36 shrink-0">
                  {r.kind === "cloudflare" ? (
                    <><Cloud className="h-3.5 w-3.5 text-orange-500" />Cloudflare</>
                  ) : (
                    <><Radio className="h-3.5 w-3.5 text-emerald-500" />Tailscale Funnel</>
                  )}
                </span>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-1 font-mono text-sm text-foreground hover:text-blue-400 hover:underline"
                >
                  <span className="truncate">{r.url}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <span className="font-mono text-xs text-muted-foreground sm:ml-auto truncate">
                  → {r.container ? `${r.container} (${r.target})` : r.target}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
