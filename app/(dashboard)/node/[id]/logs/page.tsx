"use client"

import { use, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useNodeLogs } from "@/lib/features/nodes/logs/hooks/useNodeLogs"
import { LogsToolbar, LogTerminal, LogDiagnosticModal } from "@/components/features/nodes"

export default function NodeLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const searchParams = useSearchParams()

  const containerName = searchParams.get("container") ?? ""
  const isContainerMode = containerName !== ""

  const [unitSelect, setUnitSelect] = useState("all")
  const unit = isContainerMode ? `docker:${containerName}` : unitSelect === "all" ? "" : unitSelect
  const [lines, setLines] = useState(100)
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false)

  const { logs, connected, error, clear } = useNodeLogs(nodeId, { unit, lines })

  return (
    <div className="flex flex-col -m-6 h-[calc(100%+3rem)] overflow-hidden">
      <LogsToolbar
        nodeId={nodeId}
        containerName={containerName}
        connected={connected}
        unitSelect={unitSelect}
        lines={lines}
        onUnitChange={setUnitSelect}
        onLinesChange={setLines}
        onClear={clear}
        onOpenDiagnostics={() => setIsDiagnosticOpen(true)}
      />

      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs border-b shrink-0">
          {error}
        </div>
      )}

      <LogTerminal logs={logs} />

      <LogDiagnosticModal
        nodeId={nodeId}
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        defaultUnit={unit}
      />
    </div>
  )
}
