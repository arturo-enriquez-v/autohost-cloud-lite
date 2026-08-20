"use client"

import { ArrowLeft, Box, Eraser, Sparkles, Wifi, WifiOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const UNIT_OPTIONS = [
  { value: "all", label: "All units" },
  { value: "autohost-agent", label: "autohost-agent" },
  { value: "docker", label: "docker" },
  { value: "caddy", label: "caddy" },
  { value: "coredns", label: "coredns" },
  { value: "tailscaled", label: "tailscaled" },
]

interface LogsToolbarProps {
  nodeId: string
  containerName: string
  connected: boolean
  unitSelect: string
  lines: number
  onUnitChange: (v: string) => void
  onLinesChange: (v: number) => void
  onClear: () => void
  onOpenDiagnostics?: () => void
}

export function LogsToolbar({
  nodeId,
  containerName,
  connected,
  unitSelect,
  lines,
  onUnitChange,
  onLinesChange,
  onClear,
  onOpenDiagnostics,
}: LogsToolbarProps) {
  const router = useRouter()
  const isContainerMode = containerName !== ""

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0 flex-wrap">
      <Button variant="ghost" size="icon" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="flex-1 min-w-0">
        {isContainerMode ? (
          <>
            <h2 className="text-base font-semibold leading-none flex items-center gap-1.5">
              <Box className="h-4 w-4 shrink-0 text-muted-foreground" />
              Container Logs
            </h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{containerName}</p>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold leading-none">System Logs</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{nodeId}</p>
          </>
        )}
      </div>

      <Badge
        variant="outline"
        className={
          connected
            ? "bg-green-500/10 text-green-600 border-green-500/30"
            : "bg-red-500/10 text-red-600 border-red-500/30"
        }
      >
        {connected ? (
          <><Wifi className="h-3 w-3 mr-1" />Live</>
        ) : (
          <><WifiOff className="h-3 w-3 mr-1" />Connecting…</>
        )}
      </Badge>

      {!isContainerMode && (
        <Select value={unitSelect} onValueChange={(v) => { onClear(); onUnitChange(v) }}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="All units" />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={String(lines)} onValueChange={(v) => { onClear(); onLinesChange(Number(v)) }}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[50, 100, 200, 500].map((n) => (
            <SelectItem key={n} value={String(n)} className="text-xs">
              Last {n} lines
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={onClear} className="h-8 text-xs gap-1">
        <Eraser className="h-3 w-3" />
        Clear
      </Button>

      {onOpenDiagnostics && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenDiagnostics}
          className="h-8 text-xs gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 shadow-none font-medium"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          AI Diagnostics
        </Button>
      )}
    </div>
  )
}
