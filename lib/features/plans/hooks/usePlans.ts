// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useState, useEffect, useCallback } from "react"
import { PlanUsage } from "../types"

export function usePlans() {
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const usageRes = await window.fetch("/api/plans/usage", { credentials: "include" })
      if (usageRes.ok) {
        const usageData = await usageRes.json()
        setPlanUsage(usageData)
      } else {
        setError("Failed to load resource usage")
      }
    } catch {
      setError("Network error while loading usage information")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  return {
    planUsage,
    isLoading,
    error,
    refresh: fetchUsage,
  }
}
