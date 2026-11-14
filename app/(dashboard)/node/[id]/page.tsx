"use client"

import { use, useState } from "react"
import { NodeHeader, LiveMetricsBar, ContainersPanel, CommandsPanel, JobHistoryPanel, VirtualMachinesPanel, NodeFileManager } from "@/components/features/nodes"
import { ServiceMonitorsPanel } from "@/components/features/nodes/ServiceMonitorsPanel"
import { useNodePermissions } from "@/lib/features/users/hooks/usePermissions"
import { PERMS } from "@/lib/features/users/permissions"

export default function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const [jobRefreshKey, setJobRefreshKey] = useState(0)
  const { can } = useNodePermissions(nodeId)

  const showContainers = can(PERMS.CONTAINERS_READ)
  const showCommands = can(PERMS.JOBS_READ)

  return (
    <div className="space-y-6">
      <NodeHeader nodeId={nodeId} />
      {can(PERMS.METRICS_READ) && <LiveMetricsBar nodeId={nodeId} />}

      {can(PERMS.FILES_READ) && <NodeFileManager nodeId={nodeId} />}

      {can(PERMS.VMS_READ) && <VirtualMachinesPanel nodeId={nodeId} />}

      {(showContainers || showCommands) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {showContainers && <ContainersPanel nodeId={nodeId} />}
          {showCommands && (
            <CommandsPanel
              nodeId={nodeId}
              onJobDispatched={() => setTimeout(() => setJobRefreshKey((k) => k + 1), 1000)}
            />
          )}
        </div>
      )}

      {can(PERMS.MONITORS_READ) && <ServiceMonitorsPanel nodeId={nodeId} />}
      {can(PERMS.JOBS_READ) && <JobHistoryPanel nodeId={nodeId} refreshTrigger={jobRefreshKey} />}
    </div>
  )
}

