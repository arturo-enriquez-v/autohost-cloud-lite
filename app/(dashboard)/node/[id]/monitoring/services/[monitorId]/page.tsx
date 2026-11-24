"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Cpu, MemoryStick, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import type { MetricRange } from "@/lib/features/nodes/types"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import {
  useAutoHealEvents,
  useMonitorIncidents,
  useMonitorStats,
  useServiceMonitors,
} from "@/lib/features/nodes/monitoring/hooks/useServiceMonitors"
import { useContainerMetrics } from "@/lib/features/nodes/containers/hooks/useContainerMetrics"
import {
  autoHealActivity,
  describeTarget,
  monitorState,
  type MonitorTone,
} from "@/lib/features/nodes/monitoring/monitor-status"
import { useNodePermissions } from "@/lib/features/users/hooks/usePermissions"
import { PERMS } from "@/lib/features/users/permissions"
import { MetricChart } from "@/components/features/nodes/MetricChartsGrid"
import { RangeSelector } from "@/components/features/nodes/monitors/RangeSelector"
import {
  AutoHealTimeline,
  CheckLog,
  FailedChecksChart,
  IncidentsTable,
  MonitorStatTiles,
  ResponseTimeChart,
} from "@/components/features/nodes/monitors/MonitorCharts"

const TEXT: Record<MonitorTone, string> = {
  ok: "text-green-600 dark:text-green-400",
  warn: "text-yellow-600 dark:text-yellow-400",
  bad: "text-red-600 dark:text-red-400",
  muted: "text-muted-foreground",
}

const CHECK_TYPE_LABEL: Record<string, string> = { process: "Container", http: "HTTP", tcp: "TCP" }

const LATENCY_DESCRIPTION: Record<string, string> = {
  http: "Time to get the HTTP response, for passed checks",
  tcp: "Time to open the connection, for passed checks",
}

/** CPU and memory of the container behind the monitor, from the container metrics already collected. */
function ContainerCharts({ nodeId, container, range }: { nodeId: string; container: string; range: MetricRange }) {
  const { points, isLoading } = useContainerMetrics(nodeId, container, range)
  const data = points.map((p) => ({
    bucket: p.bucket,
    cpu_usage_percent: Number(p.cpu_usage_percent.toFixed(1)),
    memory_usage_percent: Number(p.memory_usage_percent.toFixed(1)),
  }))
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <MetricChart
        title="Container CPU"
        description={`CPU used by ${container}`}
        dataKey="cpu_usage_percent"
        color="#3b82f6"
        icon={<Cpu className="h-4 w-4 text-blue-400" />}
        data={data}
        range={range}
        isLoading={isLoading}
      />
      <MetricChart
        title="Container memory"
        description={`Memory used by ${container}, as a share of its limit`}
        dataKey="memory_usage_percent"
        color="#22c55e"
        icon={<MemoryStick className="h-4 w-4 text-green-400" />}
        data={data}
        range={range}
        isLoading={isLoading}
      />
    </div>
  )
}

export default function ServiceMonitorPage({ params }: { params: Promise<{ id: string; monitorId: string }> }) {
  const { id: nodeId, monitorId } = use(params)
  const router = useRouter()
  const [range, setRange] = useState<MetricRange>("1d")
  const [checking, setChecking] = useState(false)

  const { node } = useNodes(nodeId)
  const { monitors, isLoading: monitorsLoading, checkNow } = useServiceMonitors(nodeId)
  const monitor = monitors.find((m) => m.id === monitorId)
  const { can } = useNodePermissions(nodeId)
  const { stats, isLoading: statsLoading, error: statsError } = useMonitorStats(nodeId, monitorId, range)
  const { incidents, isLoading: incidentsLoading } = useMonitorIncidents(nodeId, monitorId, range)
  const { events: autoHealEvents, isLoading: autoHealLoading } = useAutoHealEvents(nodeId, monitorId, range)

  const back = () => router.push(`/node/${nodeId}/monitoring`)

  if (!monitor) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={back}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Monitoring
        </Button>
        <p className="text-sm text-muted-foreground">
          {monitorsLoading ? "Loading…" : "This health check does not exist or you cannot see it."}
        </p>
      </div>
    )
  }

  const state = monitorState(monitor)
  const activity = autoHealActivity(monitor)
  const autoHealOn = Boolean(monitor.autoHealConfig?.enabled)
  const showLatency = monitor.checkType !== "process"
  // The container behind the service: the checked one, or the one auto-heal acts on.
  const container = monitor.checkType === "process" ? monitor.serviceName : monitor.autoHealConfig?.container || ""
  const failing = state.tone === "warn" || state.tone === "bad"

  const handleCheckNow = async () => {
    setChecking(true)
    try {
      await checkNow(monitor.id)
      toast.success(`Checking ${monitor.serviceName}…`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not run the check")
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="icon" onClick={back} aria-label="Back to monitoring">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground truncate">{monitor.serviceName}</h2>
            <Badge variant="outline" className="text-xs">
              {CHECK_TYPE_LABEL[monitor.checkType] ?? monitor.checkType}
            </Badge>
            {node && (
              <Badge variant="outline" className="text-xs font-mono">
                {node.name}
              </Badge>
            )}
            <span className={`text-sm font-medium ${TEXT[state.tone]}`}>{state.label}</span>
            {activity && (
              <Badge variant="outline" className={`text-xs ${TEXT[activity.tone]}`}>
                {activity.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 break-all">
            {describeTarget(monitor)} · every {monitor.intervalSeconds}s · down after {monitor.failureThreshold}{" "}
            failed {monitor.failureThreshold === 1 ? "check" : "checks"}
          </p>
          {failing && monitor.lastMessage && (
            <p className={`text-xs mt-1 ${TEXT[state.tone]}`}>Last check: {monitor.lastMessage}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RangeSelector value={range} onChange={setRange} />
          {can(PERMS.MONITORS_MANAGE) && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleCheckNow}
              disabled={!monitor.enabled || checking}
              title={monitor.enabled ? "Check now" : "Enable the monitor to check it"}
              aria-label="Check now"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </div>

      {statsError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {statsError}
        </div>
      )}

      <MonitorStatTiles stats={stats} showLatency={showLatency} />

      {showLatency && (
        <ResponseTimeChart
          stats={stats}
          range={range}
          isLoading={statsLoading}
          description={LATENCY_DESCRIPTION[monitor.checkType] ?? ""}
        />
      )}

      <FailedChecksChart stats={stats} range={range} isLoading={statsLoading} autoHealEvents={autoHealEvents} />

      {(autoHealOn || autoHealEvents.length > 0) && (
        <AutoHealTimeline events={autoHealEvents} isLoading={autoHealLoading} enabled={autoHealOn} />
      )}

      {container && <ContainerCharts nodeId={nodeId} container={container} range={range} />}

      <IncidentsTable incidents={incidents} isLoading={incidentsLoading} autoHealEvents={autoHealEvents} />

      <CheckLog nodeId={nodeId} monitorId={monitor.id} />
    </div>
  )
}
