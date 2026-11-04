"use client"

import { use } from "react"
import { NodeHeader } from "@/components/features/nodes/NodeHeader"
import { NodeWebTerminal } from "@/components/features/nodes/NodeWebTerminal"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"

export default function NodeTerminalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const { node } = useNodes(nodeId)

  return (
    <div className="space-y-6">
      <NodeHeader nodeId={nodeId} />
      <NodeWebTerminal
        nodeId={nodeId}
        nodeName={node?.name || node?.hostname}
        ipVpn={node?.ipVpn}
      />
    </div>
  )
}

