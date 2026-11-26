// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

/** Something the assistant finished while its panel was closed. */
export interface AssistantNotice {
  kind: "answer" | "approval" | "error"
  preview: string
  at: string
}

interface AssistantUIContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  notice: AssistantNotice | null
  setNotice: (n: AssistantNotice | null) => void
  /** Opens the panel and clears the notice (from the bell). */
  openPanel: () => void
}

const AssistantUIContext = createContext<AssistantUIContextValue | null>(null)

/** Shares the assistant panel's state with the rest of the layout (the notification bell). */
export function AssistantUIProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false)
  const [notice, setNotice] = useState<AssistantNotice | null>(null)

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value)
    if (value) setNotice(null)
  }, [])

  const openPanel = useCallback(() => setOpen(true), [setOpen])

  const value = useMemo(() => ({ open, setOpen, notice, setNotice, openPanel }), [open, setOpen, notice, openPanel])
  return <AssistantUIContext.Provider value={value}>{children}</AssistantUIContext.Provider>
}

export function useAssistantUI() {
  const ctx = useContext(AssistantUIContext)
  if (!ctx) throw new Error("useAssistantUI must be used within an AssistantUIProvider")
  return ctx
}

/** Like useAssistantUI, but null outside the provider (for components that also render elsewhere). */
export function useOptionalAssistantUI() {
  return useContext(AssistantUIContext)
}
