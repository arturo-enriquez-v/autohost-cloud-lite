// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  Bot,
  Check,
  ChevronRight,
  Eye,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Square,
  X,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useAssistantUI, type AssistantNotice } from "@/lib/context/assistant-context"
import { useAssistantStatus } from "@/lib/features/assistant/hooks/useAssistantStatus"
import { useAssistantChat, type ChatItem } from "@/lib/features/assistant/hooks/useAssistantChat"
import type { AssistantCallInfo, AssistantEffect } from "@/lib/features/assistant/interfaces/assistant"
import { Markdown } from "./Markdown"

const PREFS_KEY = "autohost.assistant.prefs"
const SIZE_KEY = "autohost.assistant.size"
const MIN_W = 360
const MIN_H = 380
const DEFAULT_SIZE = { w: 440, h: 640 }

type Size = { w: number; h: number }

function clampSize(s: Size): Size {
  if (typeof window === "undefined") return s
  return {
    w: Math.round(Math.min(Math.max(s.w, MIN_W), window.innerWidth - 40)),
    h: Math.round(Math.min(Math.max(s.h, MIN_H), window.innerHeight - 40)),
  }
}

/** True on screens where the panel floats (sm and up); on phones it fills the width. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)")
    const update = () => setDesktop(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return desktop
}

/** Plain-text extract of an answer for the notification. */
function previewOf(text: string): string {
  const plain = text.replace(/[*`#|>_-]+/g, " ").replace(/\s+/g, " ").trim()
  return plain.length > 140 ? plain.slice(0, 140) + "…" : plain
}

function EffectBadge({ effect }: { effect: AssistantEffect }) {
  if (effect === "read") return null
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px]",
        effect === "destructive" ? "border-destructive text-destructive" : "border-amber-500 text-amber-600 dark:text-amber-400"
      )}
    >
      {effect === "destructive" ? "destructive" : "changes"}
    </Badge>
  )
}

function ToolRow({ item, pending }: { item: Extract<ChatItem, { kind: "tool" }>; pending: boolean }) {
  const [open, setOpen] = useState(false)
  const { call, result } = item
  let icon
  if (result?.rejected) icon = <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
  else if (result) icon = result.ok ? <Check className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />
  else if (pending) icon = <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
  else icon = <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
  return (
    <div className="rounded-md border bg-muted/30 text-xs">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left">
        {icon}
        <span className="min-w-0 flex-1 truncate font-mono" title={call.summary}>
          {call.summary || call.name}
        </span>
        <EffectBadge effect={call.effect} />
        <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="space-y-1 border-t px-2 py-1.5">
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground">
            {call.name} {JSON.stringify(call.arguments)}
          </pre>
          {result && (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">{result.result}</pre>
          )}
        </div>
      )}
    </div>
  )
}

function ApprovalCard({ calls, onDecide, busy }: { calls: AssistantCallInfo[]; onDecide: (a: Record<string, boolean>) => void; busy: boolean }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const all = (value: boolean) => Object.fromEntries(calls.map((c) => [c.id, value]))
  return (
    <div className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium">
        <ShieldAlert className="h-4 w-4 text-amber-500" />
        {calls.length === 1 ? "The assistant wants to make a change" : "The assistant wants to make these changes"}
      </p>
      <ul className="space-y-1.5">
        {calls.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            {calls.length > 1 && (
              <Switch
                checked={!!selected[c.id]}
                onCheckedChange={(v) => setSelected((s) => ({ ...s, [c.id]: v }))}
                className="mt-0.5"
              />
            )}
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className="block break-all font-mono text-xs">{c.summary}</span>
              {c.target && <span className="block text-xs font-medium">On {c.target}</span>}
              {c.target_warning && (
                <span className="block text-xs font-medium text-destructive">
                  Check this: {c.target_warning}. The assistant may be using a wrong ID.
                </span>
              )}
            </div>
            <EffectBadge effect={c.effect} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">It runs with your permissions. Nothing happens until you approve.</p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecide(all(false))}>
          {calls.length === 1 ? "Reject" : "Reject all"}
        </Button>
        <Button
          size="sm"
          disabled={busy || (calls.length > 1 && !Object.values(selected).some(Boolean))}
          className={calls.some((c) => c.effect === "destructive") ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          onClick={() => onDecide(calls.length === 1 ? all(true) : { ...all(false), ...selected })}
        >
          {calls.length === 1 ? "Approve" : "Run selected"}
        </Button>
      </div>
    </div>
  )
}

/**
 * The built-in assistant: a floating button that opens a chat panel. It is only shown when an admin
 * has enabled the assistant. Tools run with the signed-in user's permissions; changes wait for approval.
 */
export function AssistantPanel() {
  const { status } = useAssistantStatus()
  const { open, setOpen, notice, setNotice } = useAssistantUI()
  const [model, setModel] = useState<string | undefined>(undefined)
  const [readOnly, setReadOnly] = useState(false)
  const [input, setInput] = useState("")
  const { items, pending, busy, send, decide, stop, reset } = useAssistantChat({ model, readOnly })
  const bottomRef = useRef<HTMLDivElement>(null)
  const desktop = useIsDesktop()
  const [size, setSize] = useState<Size>(DEFAULT_SIZE)
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as { model?: string; readOnly?: boolean }
      if (p.model) setModel(p.model)
      if (p.readOnly) setReadOnly(true)
      const sz = JSON.parse(localStorage.getItem(SIZE_KEY) || "null") as (Size & { maximized?: boolean }) | null
      if (sz?.w && sz?.h) setSize(clampSize(sz))
      if (sz?.maximized) setMaximized(true)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ model, readOnly }))
  }, [model, readOnly])

  useEffect(() => {
    localStorage.setItem(SIZE_KEY, JSON.stringify({ ...size, maximized }))
  }, [size, maximized])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [items, pending, open])

  // When a turn ends with the panel closed, leave a notice for the floating button and the bell.
  const wasBusy = useRef(false)
  useEffect(() => {
    if (wasBusy.current && !busy && !open) {
      const last = items[items.length - 1]
      let n: AssistantNotice
      if (pending.length > 0) {
        n = { kind: "approval", preview: pending.map((p) => p.summary).join(" · "), at: new Date().toISOString() }
      } else if (last?.kind === "error") {
        n = { kind: "error", preview: last.text, at: new Date().toISOString() }
      } else {
        const answer = [...items].reverse().find((i) => i.kind === "assistant" && i.text)
        n = { kind: "answer", preview: answer && answer.kind === "assistant" ? previewOf(answer.text) : "", at: new Date().toISOString() }
      }
      setNotice(n)
    }
    wasBusy.current = busy
  }, [busy, open, items, pending, setNotice])

  // Resizing from the left edge, the top edge or the top-left corner (the panel is anchored bottom-right).
  const startResize = useCallback(
    (e: ReactPointerEvent, dirX: boolean, dirY: boolean) => {
      e.preventDefault()
      const start = { x: e.clientX, y: e.clientY, ...size }
      setMaximized(false)
      const move = (ev: PointerEvent) => {
        setSize(
          clampSize({
            w: dirX ? start.w + (start.x - ev.clientX) : start.w,
            h: dirY ? start.h + (start.y - ev.clientY) : start.h,
          })
        )
      }
      const up = () => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        document.body.style.userSelect = ""
      }
      document.body.style.userSelect = "none"
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
    },
    [size]
  )

  if (!status?.enabled) return null
  const models = status.models
  const activeModel = model && models.includes(model) ? model : status.default_model
  const pendingIDs = new Set(pending.map((p) => p.id))

  const submit = () => {
    if (!input.trim() || busy) return
    send(input)
    setInput("")
  }

  if (!open) {
    const title = busy
      ? "Assistant: working on your request"
      : notice?.kind === "approval"
        ? "Assistant: waiting for your approval"
        : notice
          ? "Assistant: answer ready"
          : "Assistant"
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={title}
        aria-label={title}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#70AEFF] text-black shadow-lg transition-transform hover:scale-105"
      >
        <Sparkles className="h-5 w-5" />
        {/* Working: a ring spins around the button. */}
        {busy && (
          <span className="pointer-events-none absolute -inset-1 animate-spin rounded-full border-2 border-[#70AEFF] border-t-transparent" />
        )}
        {/* Done while closed: a dot, green for an answer, amber when a change waits for approval. */}
        {!busy && notice && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                notice.kind === "approval" ? "bg-amber-400" : notice.kind === "error" ? "bg-rose-400" : "bg-emerald-400"
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-3.5 w-3.5 rounded-full ring-2 ring-background",
                notice.kind === "approval" ? "bg-amber-500" : notice.kind === "error" ? "bg-rose-500" : "bg-emerald-500"
              )}
            />
          </span>
        )}
      </button>
    )
  }

  const panelSize = maximized
    ? clampSize({ w: 1100, h: typeof window === "undefined" ? 900 : window.innerHeight })
    : size

  return (
    <div
      className="fixed inset-x-2 bottom-2 z-40 flex h-[85vh] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5"
      style={desktop ? { width: panelSize.w, height: panelSize.h } : undefined}
    >
      {desktop && (
        <>
          <div className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize hover:bg-[#70AEFF]/30" onPointerDown={(e) => startResize(e, true, false)} />
          <div className="absolute inset-x-0 top-0 z-10 h-1.5 cursor-ns-resize hover:bg-[#70AEFF]/30" onPointerDown={(e) => startResize(e, false, true)} />
          <div className="absolute left-0 top-0 z-20 h-3 w-3 cursor-nwse-resize" onPointerDown={(e) => startResize(e, true, true)} />
        </>
      )}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Bot className="h-4 w-4 text-[#70AEFF]" />
        <span className="text-sm font-semibold">Assistant</span>
        {models.length > 1 ? (
          <Select value={activeModel} onValueChange={setModel}>
            <SelectTrigger size="sm" className="h-7 w-auto max-w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="truncate text-xs text-muted-foreground">{activeModel}</span>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground" title="Read-only: the assistant cannot change anything">
          <Eye className="h-3.5 w-3.5" />
          <Switch checked={readOnly} onCheckedChange={setReadOnly} />
        </label>
        <Button size="icon" variant="ghost" className="h-7 w-7" title="New conversation" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        {desktop && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title={maximized ? "Restore size" : "Enlarge"}
            onClick={() => setMaximized((m) => !m)}
          >
            {maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7" title="Close" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
        {items.length === 0 && (
          <div className="space-y-2 pt-6 text-center text-muted-foreground">
            <Sparkles className="mx-auto h-6 w-6" />
            <p>Ask about your nodes, containers, monitors or backups, or ask for a change.</p>
            <p className="text-xs">Changes always wait for your approval.{readOnly && " Read-only mode is on."}</p>
          </div>
        )}
        {items.map((item) => {
          switch (item.kind) {
            case "user":
              return (
                <div key={item.id} className="ml-8 whitespace-pre-wrap rounded-lg bg-[#70AEFF]/15 px-3 py-2">
                  {item.text}
                </div>
              )
            case "assistant":
              return (
                <div key={item.id} className="space-y-1">
                  {item.reasoning && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer select-none">Thinking</summary>
                      <p className="mt-1 whitespace-pre-wrap">{item.reasoning}</p>
                    </details>
                  )}
                  {item.text && <Markdown text={item.text} />}
                </div>
              )
            case "tool":
              return <ToolRow key={item.id} item={item} pending={pendingIDs.has(item.call.id)} />
            case "error":
              return (
                <p key={item.id} className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {item.text}
                </p>
              )
          }
        })}
        {busy && items[items.length - 1]?.kind !== "assistant" && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {pending.length > 0 && !busy && <ApprovalCard key={pending.map((p) => p.id).join()} calls={pending} onDecide={decide} busy={busy} />}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={2}
            placeholder={pending.length > 0 ? "Writing a new message rejects the pending changes" : "Ask something…"}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
          {busy ? (
            <Button size="icon" variant="outline" title="Stop" onClick={stop}>
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" title="Send" disabled={!input.trim()} onClick={submit}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
