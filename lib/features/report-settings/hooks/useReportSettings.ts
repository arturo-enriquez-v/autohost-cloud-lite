"use client"

import { useState, useEffect, useCallback } from "react"

export interface ReportSettings {
  enabled: boolean
  hour_utc: number
}

export function useReportSettings() {
  const [settings, setSettings] = useState<ReportSettings>({ enabled: false, hour_utc: 8 })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await window.fetch("/api/reports/settings", { credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setSettings(data)
      else setError(data?.error || "Failed to load report settings")
    } catch {
      setError("Network error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const save = async (next: ReportSettings) => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await window.fetch("/api/reports/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSettings(data)
        return { success: true }
      }
      const msg = data?.error || "Failed to save"
      setError(msg)
      return { success: false, error: msg }
    } catch {
      setError("Network error")
      return { success: false, error: "Network error" }
    } finally {
      setIsSaving(false)
    }
  }

  return { settings, isLoading, isSaving, error, save }
}
