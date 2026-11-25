// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useCallback, useEffect, useState } from "react"
import { AssistantService } from "../services/assistant.service"
import type { AssistantStatus } from "../interfaces/assistant"

export function useAssistantStatus() {
  const [status, setStatus] = useState<AssistantStatus | null>(null)

  const reload = useCallback(async () => {
    try {
      setStatus(await AssistantService.status())
    } catch {
      setStatus({ enabled: false, models: [] })
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { status, reload }
}
