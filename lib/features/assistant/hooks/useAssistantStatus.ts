// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useCallback, useEffect, useState } from "react"
import { AssistantService } from "../services/assistant.service"
import type { AssistantStatus } from "../interfaces/assistant"

/** Fired after an admin saves the assistant settings, so open pages pick the change up right away. */
export const ASSISTANT_SETTINGS_CHANGED = "autohost:assistant-settings-changed"

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
    window.addEventListener(ASSISTANT_SETTINGS_CHANGED, reload)
    return () => window.removeEventListener(ASSISTANT_SETTINGS_CHANGED, reload)
  }, [reload])

  return { status, reload }
}
