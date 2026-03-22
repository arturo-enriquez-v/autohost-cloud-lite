"use client"

import { use, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Circle, Eraser, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNodeLogs } from "@/lib/hooks/useNodeLogs"

// Common systemd units for self-hosted nodes
const UNIT_OPTIONS = [
  { value: "all", label: "All units" },
  { value: "autohost-agent", label: "autohost-agent" },
  { value: "docker", label: "docker" },
  { value: "caddy", label: "caddy" },
  { value: "coredns", label: "coredns" },
  { value: "tailscaled", label: "tailscaled" },
]

export default function NodeLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()

  const [unitSelect, setUnitSelect] = useState("all")
  const unit = unitSelect === "all" ? "" : unitSelect
  const [lines, setLines] = useState(100)
  const [autoScroll, setAutoScroll] = useState(true)

  const { logs, connected, error, clear } = useNodeLogs(nodeId, { unit, lines })

  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, autoScroll])

  // Detect manual scroll up to pause auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 40
    setAutoScroll(atBottom)
  }

  return (
    <div className="flex flex-col -m-6 h-[calc(100%+3rem)] overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold leading-none">System Logs</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{nodeId}</p>
        </div>

        {/* Connection indicator */}
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

        {/* Unit selector */}
        <Select value={unitSelect} onValueChange={(v) => { clear(); setUnitSelect(v) }}>
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

        {/* Lines selector */}
        <Select value={String(lines)} onValueChange={(v) => { clear(); setLines(Number(v)) }}>
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

        <Button variant="outline" size="sm" onClick={clear} className="h-8 text-xs gap-1">
          <Eraser className="h-3 w-3" />
          Clear
        </Button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs border-b shrink-0">
          {error}
        </div>
      )}

      {/* ── Log terminal ── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-zinc-950 font-mono text-xs leading-5 text-zinc-200"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm gap-2">
            <Circle className="h-3 w-3 animate-pulse" />
            Waiting for logs…
          </div>
        ) : (
          <div className="p-4 space-y-0.5">
            {logs.map((entry, i) => (
              <LogLine key={i} entry={entry} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Auto-scroll indicator ── */}
      {!autoScroll && (
        <div className="absolute bottom-4 right-4">
          <Button
            size="sm"
            variant="secondary"
            className="text-xs shadow-md"
            onClick={() => {
              setAutoScroll(true)
              bottomRef.current?.scrollIntoView({ behavior: "smooth" })
            }}
          >
            ↓ Scroll to bottom
          </Button>
        </div>
      )}
    </div>
  )
}

function LogLine({ entry }: { entry: { timestamp_us: number; unit: string; message: string } }) {
  const ts = new Date(entry.timestamp_us / 1000).toISOString().replace("T", " ").replace("Z", "")

  return (
    <div className="flex gap-2 hover:bg-zinc-900 px-1 rounded-sm">
      <span className="text-zinc-500 shrink-0 select-none">{ts}</span>
      {entry.unit && (
        <span className="text-sky-400 shrink-0 select-none max-w-[160px] truncate">{entry.unit}</span>
      )}
      <span className="text-zinc-200 break-all">{entry.message}</span>
    </div>
  )
}
