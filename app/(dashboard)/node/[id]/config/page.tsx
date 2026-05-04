"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNode } from "@/lib/features/nodes/hooks"
import {
  NodeAlertsCard,
  NodeRenameCard,
  NodeDangerZoneCard,
} from "@/lib/features/nodes/components"

export default function NodeConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()
  const { node, isLoading } = useNode(nodeId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/node/${nodeId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-foreground">Node Configuration</h2>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : node?.name ?? nodeId}
          </p>
        </div>
      </div>

      <NodeAlertsCard nodeId={nodeId} />
      <NodeRenameCard nodeId={nodeId} />
      <NodeDangerZoneCard nodeId={nodeId} />
    </div>
  )
}
