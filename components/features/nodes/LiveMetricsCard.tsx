"use client"

import { format } from "date-fns"
import { Activity, Cpu, HardDrive, MemoryStick, Radio } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useNodeMetricsLive } from "@/lib/features/nodes/hooks/useNodeMetricsLive"

function fmtBytes(bytes: number) {
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function fmtUptime(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

interface LiveStatProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  pct?: number
  color?: string
}

function LiveStat({ label, value, sub, icon, pct, color }: LiveStatProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {pct !== undefined && color && (
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className={`h-1.5 rounded-full ${color} transition-all duration-700`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

interface LiveMetricsCardProps {
  nodeId: string
}

export function LiveMetricsCard({ nodeId }: LiveMetricsCardProps) {
  const { metric: live, connected } = useNodeMetricsLive(nodeId)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio className={`h-4 w-4 ${connected ? "text-green-400 animate-pulse" : "text-muted-foreground"}`} />
          Live
          {connected && live && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {format(new Date(live.collected_at), "HH:mm:ss")}
            </span>
          )}
        </CardTitle>
        <CardDescription>Real-time snapshot via gRPC</CardDescription>
      </CardHeader>
      <CardContent>
        {!live ? (
          <p className="text-sm text-muted-foreground">
            {connected ? "Waiting for first metric…" : "Connecting…"}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <LiveStat
              label="CPU"
              value={`${live.cpu_usage_percent.toFixed(1)}%`}
              sub={
                live.cpu_temp_celsius && live.cpu_temp_celsius > 0
                  ? `Temp: ${live.cpu_temp_celsius.toFixed(1)}°C`
                  : undefined
              }
              icon={<Cpu className="h-4 w-4 text-blue-400" />}
              pct={live.cpu_usage_percent}
              color="bg-blue-400"
            />
            <LiveStat
              label="RAM"
              value={`${live.ram_usage_percent.toFixed(1)}%`}
              sub={`${fmtBytes(live.ram_used_bytes)} / ${fmtBytes(live.ram_total_bytes)}`}
              icon={<MemoryStick className="h-4 w-4 text-green-400" />}
              pct={live.ram_usage_percent}
              color="bg-green-400"
            />
            <LiveStat
              label="Disk"
              value={`${live.disk_usage_percent.toFixed(1)}%`}
              sub={`${fmtBytes(live.disk_used_bytes)} / ${fmtBytes(live.disk_total_bytes)}`}
              icon={<HardDrive className="h-4 w-4 text-orange-400" />}
              pct={live.disk_usage_percent}
              color="bg-orange-400"
            />
            <LiveStat
              label="Uptime"
              value={fmtUptime(live.uptime_seconds)}
              icon={<Activity className="h-4 w-4 text-purple-400" />}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
