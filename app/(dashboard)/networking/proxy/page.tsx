// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Globe, ShieldAlert } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import { usePermissions } from "@/lib/features/users/hooks/usePermissions"
import { PERMS } from "@/lib/features/users/permissions"
import { CloudflareTunnelCard } from "@/components/features/nodes/CloudflareTunnelCard"
import { TailscaleFunnelCard } from "@/components/features/nodes/TailscaleFunnelCard"
import { PageHeader } from "@/components/layout/PageHeader"

export default function ProxyPage() {
  return (
    <Suspense fallback={null}>
      <ProxyView />
    </Suspense>
  )
}

/**
 * Cloudflare Tunnel and Tailscale Funnel are global (one per installation, with routes to any node).
 * Each node's Caddy routes live in the node's own Proxy page. `?node=<id>` preselects the target node.
 */
function ProxyView() {
  const searchParams = useSearchParams()
  const { allNodes, isLoading: nodesLoading } = useNodes()
  const { canNode, isLoading: permsLoading } = usePermissions()
  const loading = nodesLoading || permsLoading

  const readableNodes = useMemo(
    () => allNodes.filter((n) => canNode(n.id, PERMS.NETWORK_READ)),
    [allNodes, canNode]
  )
  const manageableNodes = useMemo(
    () => allNodes.filter((n) => canNode(n.id, PERMS.NETWORK_MANAGE)),
    [allNodes, canNode]
  )

  // The cards keep their own target-node selector; they only take the initial one, fixed on first load.
  const requested = searchParams.get("node") ?? ""
  const [defaultNodeId, setDefaultNodeId] = useState("")
  useEffect(() => {
    if (defaultNodeId || loading || manageableNodes.length === 0) return
    setDefaultNodeId(manageableNodes.some((n) => n.id === requested) ? requested : manageableNodes[0].id)
  }, [defaultNodeId, loading, manageableNodes, requested])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Globe}
        title="Proxy"
        description="Expose services on any node with Cloudflare Tunnel and Tailscale Funnel. Each node's Caddy routes are in its own Proxy page."
      />

      {!loading && readableNodes.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No nodes with <code>network:read</code></p>
            <p className="text-xs text-muted-foreground">
              You need network permissions on at least one node to view the tunnels.
            </p>
          </CardContent>
        </Card>
      ) : defaultNodeId ? (
        <>
          <CloudflareTunnelCard defaultNodeId={defaultNodeId} />
          <TailscaleFunnelCard defaultNodeId={defaultNodeId} />
        </>
      ) : (
        !loading && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            Read-only mode (<code>network:read</code>). <code>network:manage</code> on a node is required to manage
            Cloudflare tunnels and Tailscale Funnel. Each node&apos;s Proxy page lists the routes that point to it.
          </div>
        )
      )}
    </div>
  )
}
