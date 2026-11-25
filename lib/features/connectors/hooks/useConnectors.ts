// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useCallback, useEffect, useState } from "react"
import { ConnectorsService } from "../services/connectors.service"
import type { Connector, ConnectorInput } from "../interfaces/connector"

/** Connectors visible to the caller, optionally of one project. */
export function useConnectors(projectId?: string) {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      setConnectors(await ConnectorsService.list(projectId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load connectors")
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    setIsLoading(true)
    reload()
  }, [reload])

  // These throw on failure so forms can show the API's message next to the fields.
  const create = useCallback(async (input: ConnectorInput) => {
    const created = await ConnectorsService.create(input)
    setConnectors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    return created
  }, [])

  const update = useCallback(async (id: string, input: ConnectorInput) => {
    const updated = await ConnectorsService.update(id, input)
    setConnectors((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }, [])

  const remove = useCallback(async (id: string) => {
    await ConnectorsService.remove(id)
    setConnectors((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { connectors, isLoading, error, reload, create, update, remove }
}
