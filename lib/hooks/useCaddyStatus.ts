"use client"

import { useState, useCallback, useRef } from "react"
import { fetchWithAuth } from "@/lib/api/fetch-client"
import type { Job } from "@/lib/types"

export type CaddyStatusState = "idle" | "checking" | "running" | "stopped" | "unknown"

function parseStatus(job: Job): CaddyStatusState {
  if (job.status === "pending" || job.status === "running") return "checking"
  if (job.status === "failed") return "unknown"
  // completed — inspect output
  if (job.output.includes("caddy_running=false")) return "stopped"
  try {
    const parsed = JSON.parse(job.output)
    if (parsed.caddy_running === true) return "running"
    if (parsed.caddy_running === false) return "stopped"
  } catch {
    // output not JSON — treat as unknown
  }
  return "unknown"
}

export function useCaddyStatus(nodeId: string) {
  const [status, setStatus] = useState<CaddyStatusState>("idle")
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
          const s = parseStatus(updated)
          if (s !== "checking") {
            stopPolling()
            setStatus(s)
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

  return { status, check }
}
