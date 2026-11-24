// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Globe, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import { useNodePermissions } from "@/lib/features/users/hooks/usePermissions"
import { PERMS } from "@/lib/features/users/permissions"
import { CaddySection } from "@/components/features/nodes/CaddySection"
import { NodePublicRoutesCard } from "@/components/features/nodes/NodePublicRoutesCard"

/**
 * What this node exposes: its own Caddy routes and the tunnel routes that point to it. The tunnels are
 * configured globally in Networking → Proxy.
 */
export default function NodeProxyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()
  const { node, isLoading: nodeLoading } = useNodes(nodeId)
  const { can, isLoading: permsLoading } = useNodePermissions(nodeId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/node/${nodeId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Proxy
          </h2>
          <p className="text-sm text-muted-foreground">
            {nodeLoading ? "Loading…" : node?.name ?? nodeId}
          </p>
        </div>
      </div>

      {!permsLoading && !can(PERMS.NETWORK_READ) ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Permission denied (<code>network:read</code>)</p>
            <p className="text-xs text-muted-foreground">
              You do not have permission to view the proxy configuration of this node.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <CaddySection nodeId={nodeId} />
          <NodePublicRoutesCard nodeId={nodeId} />
        </>
      )}
    </div>
  )
}
