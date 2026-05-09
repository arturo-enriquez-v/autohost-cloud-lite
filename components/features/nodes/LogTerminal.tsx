"use client"

import { useEffect, useRef, useState } from "react"
import { Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LogEntry } from "@/lib/hooks/useNodeLogs"

interface LogTerminalProps {
  logs: LogEntry[]
}

function LogLine({ entry }: { entry: LogEntry }) {
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

export function LogTerminal({ logs }: LogTerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, autoScroll])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40)
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto bg-zinc-950 font-mono text-xs leading-5 text-zinc-200"
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
