// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useCallback, useEffect, useState } from "react"
import { ApiTokensService } from "../services/api-tokens.service"
import type { ApiToken, CreateApiTokenInput, CreatedApiToken } from "../interfaces/api-token"

type Result<T = undefined> = { success: true; data: T } | { success: false; error: string }

function messageOf(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function useApiTokens() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setTokens(await ApiTokensService.list())
    } catch (err) {
      setError(messageOf(err, "Failed to load API tokens"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // The raw token is returned to the caller only; it is never kept in this hook's state.
  const create = async (input: CreateApiTokenInput): Promise<Result<CreatedApiToken>> => {
    try {
      const created = await ApiTokensService.create(input)
      setTokens((prev) => [created.api_token, ...prev])
      return { success: true, data: created }
    } catch (err) {
      return { success: false, error: messageOf(err, "Failed to create API token") }
    }
  }

  const revoke = async (id: string): Promise<Result> => {
    try {
      await ApiTokensService.revoke(id)
      const now = new Date().toISOString()
      setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, revoked_at: now } : t)))
      return { success: true, data: undefined }
    } catch (err) {
      return { success: false, error: messageOf(err, "Failed to revoke API token") }
    }
  }

  return { tokens, isLoading, error, reload, create, revoke }
}
