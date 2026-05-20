"use client"

import { use, useState } from "react"
import { NodeHeader, LiveMetricsBar, ContainersPanel, CommandsPanel, JobHistoryPanel, ProfilePanel } from "@/components/features/nodes"
import { ServiceMonitorsPanel } from "@/components/features/nodes/ServiceMonitorsPanel"

export default function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const [jobRefreshKey, setJobRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      <NodeHeader nodeId={nodeId} />
      <LiveMetricsBar nodeId={nodeId} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ContainersPanel nodeId={nodeId} />
        <CommandsPanel
          nodeId={nodeId}
          onJobDispatched={() => setTimeout(() => setJobRefreshKey((k) => k + 1), 1000)}
        />
      </div>

      <ServiceMonitorsPanel nodeId={nodeId} />
      <ProfilePanel nodeId={nodeId} />
      <JobHistoryPanel nodeId={nodeId} refreshTrigger={jobRefreshKey} />
    </div>
  )
}

