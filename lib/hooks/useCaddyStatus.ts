"use client"

import { useState, useCallback, useRef } from "react"
import { fetchWithAuth } from "@/lib/api/fetch-client"
import type { Job } from "@/lib/types"
import type { LiveCaddyRoute } from "@/lib/types/caddy-route"

export type CaddyStatusState = "idle" | "checking" | "running" | "stopped" | "unknown"

interface ParseResult {
  status: CaddyStatusState
  routes: LiveCaddyRoute[]
}

function parseJobOutput(job: Job): ParseResult {
  if (job.status === "pending" || job.status === "running") {
    return { status: "checking", routes: [] }
  }
  if (job.status === "failed") return { status: "unknown", routes: [] }
  // completed — inspect output
  if (job.output.includes("caddy_running=false") || job.output.includes('"caddy_running":false')) {
    return { status: "stopped", routes: [] }
  }
  try {
    const parsed = JSON.parse(job.output)
    if (parsed.caddy_running === true) {
      return {
        status: "running",
        routes: Array.isArray(parsed.routes) ? (parsed.routes as LiveCaddyRoute[]) : [],
      }
    }
    if (parsed.caddy_running === false) return { status: "stopped", routes: [] }
  } catch {
    // output not JSON — treat as unknown
  }
  return { status: "unknown", routes: [] }
}

export function useCaddyStatus(nodeId: string) {
  const [status, setStatus] = useState<CaddyStatusState>("idle")
  const [liveRoutes, setLiveRoutes] = useState<LiveCaddyRoute[]>([])
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const check = useCallback(async () => {
    stopPolling()
    setStatus("checking")
    setLiveRoutes([])

    try {
      const res = await fetchWithAuth(`/api/nodes/${nodeId}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandName: "caddy.status", commandType: "default" }),
      })

      if (!res.ok) {
        setStatus("unknown")
        return
      }

      const job: Job = await res.json()

      let attempts = 0
      const MAX_ATTEMPTS = 15

      pollingRef.current = setInterval(async () => {
        attempts++
        try {
          const pollRes = await fetchWithAuth(`/api/jobs/${job.id}`)
          if (!pollRes.ok) return
          const updated: Job = await pollRes.json()
          const result = parseJobOutput(updated)
          if (result.status !== "checking") {
            stopPolling()
            setStatus(result.status)
            setLiveRoutes(result.routes)
            return
          }
        } catch {
          // ignore transient errors
        }
        if (attempts >= MAX_ATTEMPTS) {
          stopPolling()
          setStatus("unknown")
        }
      }, 2000)
    } catch {
      setStatus("unknown")
    }
  }, [nodeId, stopPolling])

  return { status, check, liveRoutes }
}

