"use client"

import { use } from "react"
import { ShieldAlert } from "lucide-react"
import { NodeHeader } from "@/components/features/nodes/NodeHeader"
import { NodeWebTerminal } from "@/components/features/nodes/NodeWebTerminal"
import { Card, CardContent } from "@/components/ui/card"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import { useNodePermissions } from "@/lib/features/users/hooks/usePermissions"
import { PERMS } from "@/lib/features/users/permissions"

export default function NodeTerminalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const { node } = useNodes(nodeId)
  const { can, isLoading } = useNodePermissions(nodeId)

  const canExecTerminal = can(PERMS.TERMINAL_EXEC)

  return (
    <div className="space-y-6">
      <NodeHeader nodeId={nodeId} />
      {!isLoading && !canExecTerminal ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Permiso denegado (<code>terminal:exec</code>)</p>
            <p className="text-xs text-muted-foreground">
              No tienes permiso para abrir la terminal interactiva en este nodo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <NodeWebTerminal
          nodeId={nodeId}
          nodeName={node?.name || node?.hostname}
          ipVpn={node?.ipVpn}
        />
      )}
    </div>
  )
}

