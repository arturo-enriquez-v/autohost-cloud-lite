"use client"

import { use } from "react"
import { NodeHeader } from "@/components/features/nodes/NodeHeader"
import { NodeFileManager } from "@/components/features/nodes/NodeFileManager"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"

export default function NodeFilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const { node } = useNodes(nodeId)

  return (
    <div className="space-y-6">
      <NodeHeader nodeId={nodeId} />
      <NodeFileManager
        nodeId={nodeId}
        nodeName={node?.name || node?.hostname}
      />
    </div>
  )
}

