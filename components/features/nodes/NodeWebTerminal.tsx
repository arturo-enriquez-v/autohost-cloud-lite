"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Terminal as TerminalIcon,
  RefreshCw,
  Trash2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Play,
  CornerDownLeft,
  FolderOpen,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface NodeWebTerminalProps {
  nodeId: string
  nodeName?: string
  ipVpn?: string
}

interface AnsiSpan {
  text: string
  fg?: string
  bold?: boolean
}

const ANSI_FG_COLORS: Record<number, string> = {
  30: "#64748b",
  31: "#f87171",
  32: "#34d399",
  33: "#fbbf24",
  34: "#60a5fa",
  35: "#c084fc",
  36: "#22d3ee",
  37: "#e2e8f0",
  90: "#94a3b8",
  91: "#fca5a5",
  92: "#6ee7b7",
  93: "#fde047",
  94: "#93c5fd",
  95: "#d8b4fe",
  96: "#67e8f9",
  97: "#f8fafc",
}

function parseAnsiLine(line: string): AnsiSpan[] {
  const spans: AnsiSpan[] = []
  let currentFg: string | undefined = undefined
  let currentBold = false

  // Strip OSC sequences (e.g. \x1b]0;user@host:dir\x07) and private mode sequences (\x1b[?2004h)
  const cleaned = line
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, "")
    .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, "")

  const regex = /\x1b\[([0-9;]*)([a-zA-Z])/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      spans.push({
        text: cleaned.slice(lastIndex, match.index),
        fg: currentFg,
        bold: currentBold,
      })
    }
    const params = match[1]
    const cmd = match[2]
    if (cmd === "m") {
      const codes = params === "" ? [0] : params.split(";").map((n) => parseInt(n, 10))
      for (const code of codes) {
        if (code === 0) {
          currentFg = undefined
          currentBold = false
        } else if (code === 1) {
          currentBold = true
        } else if (code === 22) {
          currentBold = false
        } else if (code === 39) {
          currentFg = undefined
        } else if (ANSI_FG_COLORS[code]) {
          currentFg = ANSI_FG_COLORS[code]
        }
      }
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < cleaned.length) {
    spans.push({
      text: cleaned.slice(lastIndex),
      fg: currentFg,
      bold: currentBold,
    })
  }

  return spans
}

const QUICK_COMMANDS = [
  { label: "Shared Folder", cmd: "cd ${AUTOHOST_SHARED_DIR:-/var/lib/autohost/shared} && ls -la\r", icon: FolderOpen },
  { label: "Disk Usage", cmd: "df -h\r" },
  { label: "Containers", cmd: "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'\r" },
  { label: "Memory", cmd: "free -h\r" },
  { label: "Tailscale", cmd: "tailscale status\r" },
  { label: "System Info", cmd: "uname -a && uptime\r" },
]

export function NodeWebTerminal({ nodeId, nodeName, ipVpn }: NodeWebTerminalProps) {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting")
  const [sessionId, setSessionId] = useState<string>("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lines, setLines] = useState<string[]>([])
  const [currentLine, setCurrentLine] = useState<string>("")
  const [commandInput, setCommandInput] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const lineBufferRef = useRef<{ lines: string[]; current: string }>({
    lines: [],
    current: "",
  })

  const appendTerminalData = useCallback((rawChunk: string) => {
    const state = lineBufferRef.current
    let { lines: bufLines, current } = state

    // Remove OSC window title sequences
    const chunk = rawChunk.replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, "")

    let i = 0
    while (i < chunk.length) {
      // Check for Clear Screen sequence \x1b[2J or \x1b[H\x1b[2J
      if (chunk.startsWith("\x1b[2J", i) || chunk.startsWith("\x1b[H\x1b[2J", i)) {
        bufLines = []
        current = ""
        i += chunk.startsWith("\x1b[H\x1b[2J", i) ? 7 : 4
        continue
      }
      // Check for Erase in Line \x1b[K or \x1b[0K
      if (chunk.startsWith("\x1b[K", i) || chunk.startsWith("\x1b[0K", i)) {
        i += chunk.startsWith("\x1b[0K", i) ? 4 : 3
        continue
      }

      const ch = chunk[i]
      if (ch === "\n") {
        bufLines.push(current)
        if (bufLines.length > 1500) {
          bufLines = bufLines.slice(bufLines.length - 1500)
        }
        current = ""
      } else if (ch === "\r") {
        // If followed by \n, \n will commit the line; otherwise carriage return resets line if non-ANSI text follows
        if (i + 1 < chunk.length && chunk[i + 1] !== "\n") {
          current = ""
        }
      } else if (ch === "\b" || ch === "\x08" || ch === "\x7f") {
        if (current.length > 0) {
          current = current.slice(0, -1)
        }
      } else if (ch === "\x07") {
        // Bell - ignore
      } else {
        current += ch
      }
      i++
    }

    lineBufferRef.current = { lines: bufLines, current }
    setLines([...bufLines])
    setCurrentLine(current)
  }, [])

  const sendInput = useCallback((data: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: "input", data }))
  }, [])

  const connectTerminal = useCallback(async () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus("connecting")
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/nodes/${nodeId}/terminal-session`, {
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error("Could not authorize terminal session")
      }
      const { token, api_url } = await res.json()

      let wsBase = ""
      if (typeof window !== "undefined") {
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
        // Always default to the hostname the browser used to load the dashboard (LAN IP, Tailscale IP, or domain)
        let host = window.location.hostname
        let port = window.location.port === "3000" ? "8080" : (window.location.port || (window.location.protocol === "https:" ? "443" : "80"))

        if (api_url) {
          try {
            const u = new URL(api_url)
            // If api_url defines a custom port and web is on port 3000
            if (u.port && window.location.port === "3000") {
              port = u.port
            }
            // If api_url is a public domain matching the browser's current host
            if (u.hostname && !u.hostname.includes("api:") && !u.hostname.includes("localhost") && !u.hostname.includes("127.0.0.1") && !u.hostname.startsWith("100.")) {
              if (window.location.hostname === u.hostname) {
                host = u.hostname
              }
            }
          } catch {}
        }

        wsBase = `${proto}//${host}:${port}`
      }

      const cols = 120
      const rows = 34
      const wsUrl = `${wsBase}/v1/nodes/${nodeId}/terminal?token=${encodeURIComponent(token)}&cols=${cols}&rows=${rows}`
      console.log(`[Terminal] Connecting to WebSocket: ${wsUrl}`)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      // Connection timeout: transition out of connecting if no response in 8 seconds
      const connTimer = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close()
          setStatus("error")
          setErrorMsg(`Tiempo de espera agotado al conectar a ${wsBase}. Verifica que el puerto 8080 esté abierto y accesible desde tu red.`)
        }
      }, 8000)

      ws.onopen = () => {
        clearTimeout(connTimer)
        setStatus("connected")
        setErrorMsg(null)
      }

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data)
          if (msg.type === "connected") {
            setSessionId(msg.session_id || "")
            setStatus("connected")
          } else if (msg.type === "output" && typeof msg.data === "string") {
            appendTerminalData(msg.data)
          } else if (msg.type === "exit") {
            appendTerminalData(`\r\n\x1b[33m[Process exited with code ${msg.exit_code ?? 0}]\x1b[0m\r\n`)
            setStatus("disconnected")
          } else if (msg.type === "error") {
            setErrorMsg(msg.message || "Terminal error")
            appendTerminalData(`\r\n\x1b[31m[Error: ${msg.message || "Terminal error"}]\x1b[0m\r\n`)
            setStatus("error")
          }
        } catch {
          if (typeof evt.data === "string") {
            appendTerminalData(evt.data)
          }
        }
      }

      ws.onerror = (err) => {
        clearTimeout(connTimer)
        setStatus("error")
        setErrorMsg(`Error de conexión WebSocket (${wsBase}). Verifica que el puerto 8080 esté abierto y accesible.`)
      }

      ws.onclose = () => {
        clearTimeout(connTimer)
        setStatus((prev) => (prev === "error" ? "error" : "disconnected"))
      }
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect to node terminal")
    }
  }, [nodeId, appendTerminalData])

  useEffect(() => {
    connectTerminal()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connectTerminal])

  useEffect(() => {
    const el = viewportRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [lines, currentLine])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (status !== "connected") return

    // Allow browser copy shortcut if text is selected
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      const sel = window.getSelection()?.toString()
      if (sel && sel.length > 0) {
        return
      }
      e.preventDefault()
      sendInput("\x03") // SIGINT (Ctrl+C)
      return
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      return // Let onPaste handle clipboard paste
    }

    if (e.ctrlKey && !e.altKey && !e.metaKey) {
      const k = e.key.toLowerCase()
      if (k === "l") {
        e.preventDefault()
        sendInput("\x0c")
        return
      }
      if (k === "d") {
        e.preventDefault()
        sendInput("\x04")
        return
      }
      if (k === "u") {
        e.preventDefault()
        sendInput("\x15")
        return
      }
      if (k === "w") {
        e.preventDefault()
        sendInput("\x17")
        return
      }
      if (k === "z") {
        e.preventDefault()
        sendInput("\x1a")
        return
      }
      if (k === "a") {
        e.preventDefault()
        sendInput("\x01")
        return
      }
      if (k === "e") {
        e.preventDefault()
        sendInput("\x05")
        return
      }
    }

    switch (e.key) {
      case "Enter":
        e.preventDefault()
        sendInput("\r")
        break
      case "Backspace":
        e.preventDefault()
        sendInput("\x7f")
        break
      case "Tab":
        e.preventDefault()
        sendInput("\t")
        break
      case "Escape":
        e.preventDefault()
        sendInput("\x1b")
        break
      case "ArrowUp":
        e.preventDefault()
        sendInput("\x1b[A")
        break
      case "ArrowDown":
        e.preventDefault()
        sendInput("\x1b[B")
        break
      case "ArrowRight":
        e.preventDefault()
        sendInput("\x1b[C")
        break
      case "ArrowLeft":
        e.preventDefault()
        sendInput("\x1b[D")
        break
      case "Home":
        e.preventDefault()
        sendInput("\x1b[H")
        break
      case "End":
        e.preventDefault()
        sendInput("\x1b[F")
        break
      case "Delete":
        e.preventDefault()
        sendInput("\x1b[3~")
        break
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          sendInput(e.key)
        }
        break
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (status !== "connected") return
    const text = e.clipboardData.getData("text")
    if (text) {
      e.preventDefault()
      sendInput(text)
    }
  }

  const handleClear = () => {
    lineBufferRef.current = { lines: [], current: "" }
    setLines([])
    setCurrentLine("")
  }

  const handleCopyAll = () => {
    const allText = [...lines, currentLine]
      .join("\n")
      .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
    navigator.clipboard.writeText(allText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCommandBarSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commandInput.trim() && commandInput === "") {
      sendInput("\r")
      return
    }
    sendInput(commandInput + "\r")
    setCommandInput("")
  }

  return (
    <div
      className={`flex flex-col rounded-xl border border-slate-800 bg-[#0a0e17] shadow-2xl overflow-hidden transition-all ${
        isFullscreen ? "fixed inset-4 z-50" : "h-[640px]"
      }`}
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 mr-1">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <TerminalIcon className="h-4 w-4 text-[#70AEFF]" />
          <span className="text-xs font-mono font-semibold text-slate-200">
            {nodeName || nodeId} — PTY Shell
          </span>

          {ipVpn && (
            <Badge
              variant="outline"
              className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1"
            >
              <Shield className="h-2.5 w-2.5" />
              Tailscale {ipVpn}
            </Badge>
          )}

          <Badge
            variant="outline"
            className={
              status === "connected"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"
                : status === "connecting"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30 text-[10px]"
            }
          >
            {status === "connected" ? (
              <Wifi className="h-2.5 w-2.5 mr-1" />
            ) : (
              <WifiOff className="h-2.5 w-2.5 mr-1" />
            )}
            {status}
          </Badge>

          {sessionId && (
            <span className="hidden md:inline text-[10px] text-slate-500 font-mono">
              session:{sessionId.slice(0, 8)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyAll}
            className="h-7 px-2 text-xs text-slate-400 hover:text-slate-100"
            title="Copy terminal output"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2 text-xs text-slate-400 hover:text-slate-100"
            title="Clear output"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={connectTerminal}
            className="h-7 px-2 text-xs text-slate-400 hover:text-slate-100 gap-1"
            title="Reconnect session"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${status === "connecting" ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Reconnect</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen((v) => !v)}
            className="h-7 px-2 text-xs text-slate-400 hover:text-slate-100"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Quick Commands Bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/50 border-b border-slate-800/80 overflow-x-auto">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mr-1 shrink-0">
          Quick Run:
        </span>
        {QUICK_COMMANDS.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={status !== "connected"}
            onClick={() => {
              sendInput(item.cmd)
              viewportRef.current?.focus()
            }}
            className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-40 text-[11px] font-mono text-slate-300 border border-slate-700/60 shrink-0 transition-colors flex items-center gap-1"
          >
            <Play className="h-2.5 w-2.5 text-[#70AEFF]" />
            {item.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="px-4 py-2 bg-rose-950/60 border-b border-rose-800/50 text-rose-300 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <Button size="sm" variant="outline" onClick={connectTerminal} className="h-6 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Interactive Terminal Viewport */}
      <div
        ref={viewportRef}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={() => viewportRef.current?.focus()}
        className="flex-1 p-4 overflow-y-auto font-mono text-[13px] leading-relaxed text-slate-200 cursor-text outline-none select-text"
      >
        {lines.map((line, idx) => {
          const spans = parseAnsiLine(line)
          return (
            <div key={idx} className="whitespace-pre-wrap break-all min-h-[1.25rem]">
              {spans.map((s, sIdx) => (
                <span
                  key={sIdx}
                  style={{
                    color: s.fg,
                    fontWeight: s.bold ? 600 : undefined,
                  }}
                >
                  {s.text}
                </span>
              ))}
            </div>
          )
        })}

        {/* Active Prompt Line + Cursor */}
        <div className="whitespace-pre-wrap break-all min-h-[1.25rem]">
          {parseAnsiLine(currentLine).map((s, sIdx) => (
            <span
              key={sIdx}
              style={{
                color: s.fg,
                fontWeight: s.bold ? 600 : undefined,
              }}
            >
              {s.text}
            </span>
          ))}
          {status === "connected" && (
            <span
              className={`inline-block w-2 h-4 align-middle ml-0.5 ${
                isFocused ? "bg-[#70AEFF] animate-pulse" : "border border-[#70AEFF]"
              }`}
            />
          )}
        </div>
      </div>

      {/* Bottom Command Input Bar (helpful for mobile/paste/quick entry) */}
      <form
        onSubmit={handleCommandBarSubmit}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 border-t border-slate-800"
      >
        <span className="text-xs font-mono text-emerald-400 font-bold select-none">$</span>
        <Input
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          disabled={status !== "connected"}
          placeholder="Click terminal above to type directly, or type/paste a command here and press Enter…"
          className="h-8 bg-slate-950 border-slate-800 font-mono text-xs text-slate-200 focus-visible:ring-[#70AEFF]/40"
        />
        <Button
          type="submit"
          size="sm"
          disabled={status !== "connected"}
          className="h-8 bg-[#70AEFF] hover:bg-[#5b9df5] text-slate-950 font-semibold text-xs gap-1 shrink-0"
        >
          <CornerDownLeft className="h-3.5 w-3.5" />
          Send
        </Button>
      </form>
    </div>
  )
}

