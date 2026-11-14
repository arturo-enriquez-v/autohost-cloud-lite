"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Globe, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import { useCaddyStatus } from "@/lib/features/nodes/caddy/hooks/useCaddyStatus"
import { useNodePermissions } from "@/lib/features/users/hooks/usePermissions"
import { PERMS } from "@/lib/features/users/permissions"
import { CaddyStatusBanner } from "@/components/features/nodes/CaddyStatusBanner"
import { CaddyRoutesCard } from "@/components/features/nodes/CaddyRoutesCard"
import { CloudflareTunnelCard } from "@/components/features/nodes/CloudflareTunnelCard"
import { TailscaleFunnelCard } from "@/components/features/nodes/TailscaleFunnelCard"

export default function NodeProxyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()

  const { node, isLoading: nodeLoading } = useNodes(nodeId)
  const { status: caddyStatus, check: checkCaddy, liveRoutes } = useCaddyStatus(nodeId)
  const { can, isLoading: permsLoading } = useNodePermissions(nodeId)

  const canReadNetwork = can(PERMS.NETWORK_READ)
  const canManageNetwork = can(PERMS.NETWORK_MANAGE)

  useEffect(() => { checkCaddy() }, [nodeId])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/node/${nodeId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Reverse Proxy · Cloudflare Tunnel &amp; Tailscale Funnel
          </h2>
          <p className="text-sm text-muted-foreground">
            {nodeLoading ? "Loading…" : node?.name ?? nodeId}
          </p>
        </div>
      </div>

      {!permsLoading && !canReadNetwork ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Permiso denegado (<code>network:read</code>)</p>
            <p className="text-xs text-muted-foreground">
              No tienes permiso para ver la configuración de red y proxy de este nodo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {canManageNetwork ? (
            <>
              <CloudflareTunnelCard defaultNodeId={nodeId} />
              <TailscaleFunnelCard defaultNodeId={nodeId} />
            </>
          ) : (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              Modo solo lectura (<code>network:read</code>). Se requiere <code>network:manage</code> para administrar túneles Cloudflare, Tailscale Funnel o rutas Caddy.
            </div>
          )}
          <CaddyStatusBanner status={caddyStatus} onRetry={checkCaddy} />
          <CaddyRoutesCard nodeId={nodeId} caddyStatus={caddyStatus} liveRoutes={liveRoutes} />
        </>
      )}
    </div>
  )
}
