// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ConnectorsService } from "../services/connectors.service"
import type { Connector, ConnectorParamValues, ConnectorResult } from "../interfaces/connector"

interface Options {
  /** Run once on mount (query widgets without required params). */
  auto?: boolean
  /** Re-run every N seconds while mounted (0 = off). */
  refreshSeconds?: number
}

/** Runs a saved connector and keeps its latest result. */
export function useConnectorRun(connector: Connector, options: Options = {}) {
  const { auto = false, refreshSeconds = 0 } = options
  const [result, setResult] = useState<ConnectorResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const lastParams = useRef<ConnectorParamValues>({})

  const run = useCallback(
    async (params: ConnectorParamValues = lastParams.current) => {
      lastParams.current = params
      setIsRunning(true)
      setError(null)
      try {
        const res = await ConnectorsService.run(connector.id, params)
        setResult(res)
        return res
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to run connector")
        return null
      } finally {
        setIsRunning(false)
      }
    },
    [connector.id]
  )

  // A new version of the connector invalidates the previous result.
  useEffect(() => {
    setResult(null)
    setError(null)
    if (auto) run(lastParams.current)
  }, [auto, run, connector.updated_at])

  useEffect(() => {
    if (!refreshSeconds) return
    const t = setInterval(() => {
      if (document.visibilityState === "visible") run()
    }, refreshSeconds * 1000)
    return () => clearInterval(t)
  }, [refreshSeconds, run])

  return { result, error, isRunning, run }
}
