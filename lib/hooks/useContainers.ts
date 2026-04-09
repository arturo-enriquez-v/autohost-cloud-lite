"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { fetchWithAuth } from "@/lib/api/fetch-client"
import type { DockerContainer } from "@/lib/types"

export type ContainerAction = "start" | "stop" | "restart" | "stats"

/** Dispatch a job and block until it reaches a terminal status (max 30 s). */
async function dispatchAndPoll(
  nodeId: string,
  commandName: string,
): Promise<{ output: string; error: string }> {
  const res = await fetchWithAuth(`/api/nodes/${nodeId}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commandName, commandType: "default" }),
  })
  if (!res.ok) throw new Error("Failed to dispatch job")
  const job = await res.json()

  for (let i = 0; i < 15; i++) {
    await new Promise<void>((r) => setTimeout(r, 2000))
    try {
      const pollRes = await fetchWithAuth(`/api/jobs/${job.id}`)
      if (!pollRes.ok) continue
      const updated = await pollRes.json()
      if (updated.status === "completed" || updated.status === "failed") {
        return { output: updated.output ?? "", error: updated.error ?? "" }
      }
    } catch {
      // ignore transient errors during polling
    }
  }
  throw new Error("Timeout: no response from node within 30 s")
}

const AUTO_REFRESH_MS = 10_000

export function useContainers(nodeId: string) {
  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [actionState, setActionState] = useState<{ name: string; action: ContainerAction } | null>(null)
  const refreshingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    setIsRefreshing(true)
    setRefreshError(null)
    try {
      const { output, error } = await dispatchAndPoll(nodeId, "container.list")
      if (error) throw new Error(error)
      const parsed: DockerContainer[] = JSON.parse(output || "[]")
      setContainers(parsed)
      setLastRefreshed(new Date())
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Failed to list containers")
    } finally {
      setIsRefreshing(false)
      refreshingRef.current = false
    }
  }, [nodeId])

  // Auto-refresh every 15 s
  useEffect(() => {
    const id = setInterval(refresh, AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  const runAction = useCallback(
    async (name: string, action: ContainerAction) => {
      setActionState({ name, action })
      try {
        await dispatchAndPoll(nodeId, `container.${action}.${name}`)
      } finally {
        setActionState(null)
        // Refresh to reflect new state regardless of success/failure
        await refresh()
      }
    },
    [nodeId, refresh],
  )

  return { containers, isRefreshing, lastRefreshed, refreshError, actionState, refresh, runAction }
}
