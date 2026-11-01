"use client"

import { Radio, Cpu, MemoryStick, HardDrive, Activity, Thermometer } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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

interface LiveMetricsBarProps {
  nodeId: string
}

export function LiveMetricsBar({ nodeId }: LiveMetricsBarProps) {
  const { metric: live, connected: liveConnected } = useNodeMetricsLive(nodeId)

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs sm:text-sm">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Radio className={`h-3.5 w-3.5 ${liveConnected ? "text-green-400 animate-pulse" : "text-muted-foreground"}`} />
            {liveConnected ? "Live" : "Connecting…"}
          </span>

          {live ? (
            <>
              <div className="hidden sm:block h-4 w-px bg-border shrink-0" />
              <span className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="font-medium">{live.cpu_usage_percent.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground">CPU</span>
              </span>
              {live.cpu_temp_celsius && live.cpu_temp_celsius > 0 ? (
                <>
                  <div className="hidden sm:block h-4 w-px bg-border shrink-0" />
                  <span className="flex items-center gap-1.5">
                    <Thermometer className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="font-medium">{live.cpu_temp_celsius.toFixed(1)}°C</span>
                    <span className="text-xs text-muted-foreground">Temp</span>
                  </span>
                </>
              ) : null}
              <div className="hidden sm:block h-4 w-px bg-border shrink-0" />
              <span className="flex items-center gap-1.5">
                <MemoryStick className="h-3.5 w-3.5 text-green-400 shrink-0" />
                <span className="font-medium">{live.ram_usage_percent.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground">of {fmtBytes(live.ram_total_bytes)} RAM</span>
              </span>
              <div className="hidden sm:block h-4 w-px bg-border shrink-0" />
              <span className="flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span className="font-medium">{live.disk_usage_percent.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground">of {fmtBytes(live.disk_total_bytes)} disk</span>
              </span>
              <div className="hidden sm:block h-4 w-px bg-border shrink-0" />
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span className="font-medium">{fmtUptime(live.uptime_seconds)}</span>
                <span className="text-xs text-muted-foreground">uptime</span>
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Waiting for first metric…</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
