"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, Activity, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import type { MetricRange } from "@/lib/features/nodes/types"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import { useNodeMetrics } from "@/lib/features/nodes/monitoring/hooks/useNodeMetrics"
import { LiveMetricsCard, MetricChartsGrid } from "@/components/features/nodes"
import { RangeSelector } from "@/components/features/nodes/monitors/RangeSelector"
import { ServiceMonitorsOverview } from "@/components/features/nodes/monitors/ServiceMonitorsOverview"
import { useNodePermissions } from "@/lib/features/users/hooks/usePermissions"
import { PERMS } from "@/lib/features/users/permissions"

export default function MonitoringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()
  const [range, setRange] = useState<MetricRange>("7d")

  const { node, isLoading: nodeLoading } = useNodes(nodeId)
  const { points, isLoading, error, lastUpdated, refresh } = useNodeMetrics(nodeId, range)
  const { can } = useNodePermissions(nodeId)

  const chartData = points.map((p) => ({
    bucket: p.bucket,
    cpu_usage_percent: parseFloat(p.cpu_usage_percent.toFixed(1)),
    memory_usage_percent: parseFloat(p.memory_usage_percent.toFixed(1)),
    disk_usage_percent: parseFloat(p.disk_usage_percent.toFixed(1)),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground truncate flex items-center gap-2">
              <Activity className="h-6 w-6 shrink-0" />
              Monitoring
            </h2>
            {!nodeLoading && node && (
              <Badge variant="outline" className="text-xs font-mono">{node.name}</Badge>
            )}
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              History updated {format(lastUpdated, "HH:mm:ss")} · auto-refreshes every 30s
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RangeSelector value={range} onChange={setRange} />
          <Button variant="outline" size="icon" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <LiveMetricsCard nodeId={nodeId} />
      {can(PERMS.MONITORS_READ) && <ServiceMonitorsOverview nodeId={nodeId} range={range} />}
      <MetricChartsGrid data={chartData} range={range} isLoading={isLoading} />
    </div>
  )
}
