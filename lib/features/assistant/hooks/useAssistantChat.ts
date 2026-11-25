// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AssistantService } from "../services/assistant.service"
import type {
  AssistantCallInfo,
  AssistantEvent,
  AssistantMessage,
  AssistantToolResult,
} from "../interfaces/assistant"

/** What the chat shows, built from the turn's events. */
export type ChatItem =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string; reasoning: string }
  | { kind: "tool"; id: string; call: AssistantCallInfo; result?: AssistantToolResult }
  | { kind: "error"; id: string; text: string }

interface Stored {
  messages: AssistantMessage[]
  items: ChatItem[]
  pending: AssistantCallInfo[]
}

// The conversation lives in sessionStorage: it survives navigation and reloads in this tab only.
const STORAGE_KEY = "autohost.assistant.conversation"

function load(): Stored {
  if (typeof window === "undefined") return { messages: [], items: [], pending: [] }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Stored
  } catch {
    // ignore a corrupt entry
  }
  return { messages: [], items: [], pending: [] }
}

let seq = 0
const newID = () => `i${Date.now()}-${seq++}`

export function useAssistantChat(options: { model?: string; readOnly: boolean }) {
  const [state, setState] = useState<Stored>(() => ({ messages: [], items: [], pending: [] }))
  const [busy, setBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const loaded = useRef(false)
  // Latest state, to build requests outside setState updaters (which React may run later).
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    setState(load())
    loaded.current = true
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full: the conversation still works in memory
    }
  }, [state])

  // Applies one event to the visible items.
  const apply = useCallback((e: AssistantEvent) => {
    setState((s) => {
      const items = [...s.items]
      const last = items[items.length - 1]
      switch (e.type) {
        case "delta":
        case "reasoning": {
          let target = last?.kind === "assistant" ? last : null
          if (!target) {
            target = { kind: "assistant", id: newID(), text: "", reasoning: "" }
            items.push(target)
          }
          const updated =
            e.type === "delta"
              ? { ...target, text: target.text + e.data.text }
              : { ...target, reasoning: target.reasoning + e.data.text }
          items[items.length - 1] = updated
          return { ...s, items }
        }
        case "tool_call":
          items.push({ kind: "tool", id: newID(), call: e.data })
          return { ...s, items }
        case "tool_result": {
          const i = items.findLastIndex((it) => it.kind === "tool" && it.call.id === e.data.id)
          if (i >= 0) items[i] = { ...(items[i] as Extract<ChatItem, { kind: "tool" }>), result: e.data }
          return { ...s, items }
        }
        case "confirm":
          return { ...s, pending: e.data.calls }
        case "done":
          return { ...s, messages: [...s.messages, ...e.data.messages] }
        case "error":
          items.push({ kind: "error", id: newID(), text: e.data.error })
          return { ...s, items }
        default:
          return s
      }
    })
  }, [])

  const run = useCallback(
    async (messages: AssistantMessage[], approvals?: Record<string, boolean>) => {
      const controller = new AbortController()
      abortRef.current = controller
      setBusy(true)
      try {
        await AssistantService.chat(
          { messages, approvals, model: options.model, read_only: options.readOnly },
          apply,
          controller.signal
        )
      } catch (err) {
        if (!controller.signal.aborted) {
          apply({ type: "error", data: { error: err instanceof Error ? err.message : "The assistant failed" } })
        }
      } finally {
        setBusy(false)
        abortRef.current = null
      }
    },
    [apply, options.model, options.readOnly]
  )

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return
      const s = stateRef.current
      // A new message drops calls still waiting for approval: they never run.
      const base = s.pending.length > 0 ? s.messages.slice(0, -1) : s.messages
      const history: AssistantMessage[] = [...base, { role: "user", content: trimmed }]
      const next: Stored = { messages: history, items: [...s.items, { kind: "user", id: newID(), text: trimmed }], pending: [] }
      stateRef.current = next
      setState(next)
      run(history)
    },
    [busy, run]
  )

  /** Answers the calls waiting for approval and continues the turn. */
  const decide = useCallback(
    (approvals: Record<string, boolean>) => {
      if (busy) return
      const s = stateRef.current
      const next = { ...s, pending: [] }
      stateRef.current = next
      setState(next)
      run(s.messages, approvals)
    },
    [busy, run]
  )

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState({ messages: [], items: [], pending: [] })
  }, [])

  return { items: state.items, pending: state.pending, busy, send, decide, stop, reset }
}
