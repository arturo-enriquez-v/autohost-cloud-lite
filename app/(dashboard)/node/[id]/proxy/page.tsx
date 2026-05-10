"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import { useCaddyStatus } from "@/lib/features/nodes/caddy/hooks/useCaddyStatus"
import { CaddyStatusBanner } from "@/components/features/nodes/CaddyStatusBanner"
import { CaddyRoutesCard } from "@/components/features/nodes/CaddyRoutesCard"

export default function NodeProxyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()

  const { node, isLoading: nodeLoading } = useNodes(nodeId)
  const { status: caddyStatus, check: checkCaddy, liveRoutes } = useCaddyStatus(nodeId)

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
            Reverse Proxy
          </h2>
          <p className="text-sm text-muted-foreground">
            {nodeLoading ? "Loading…" : node?.name ?? nodeId}
          </p>
        </div>
      </div>

      <CaddyStatusBanner status={caddyStatus} onRetry={checkCaddy} />
      <CaddyRoutesCard nodeId={nodeId} caddyStatus={caddyStatus} liveRoutes={liveRoutes} />
    </div>
  )
}
