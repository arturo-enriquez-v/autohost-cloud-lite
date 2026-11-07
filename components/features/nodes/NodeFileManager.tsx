"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  Folder,
  FolderPlus,
  FileText,
  Upload,
  Download,
  Trash2,
  Send,
  RefreshCw,
  ArrowUpLeft,
  ChevronRight,
  HardDrive,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Server,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface NodeFileEntry {
  name: string
  path: string
  is_dir: boolean
  size_bytes: number
  modified_at: string
  mode: string
}

interface TargetNodeOption {
  id: string
  hostname: string
  ip_vpn?: string
  ip_local?: string
  is_local?: boolean
}

export interface ActiveTransfer {
  id: string
  type: "upload" | "download"
  filename: string
  progress: number // 0 to 100
  loadedBytes: number
  totalBytes: number
  speedStr: string
  cancel: () => void
}

interface NodeFileManagerProps {
  nodeId: string
  nodeName?: string
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / Math.pow(1024, i)
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function NodeFileManager({ nodeId, nodeName }: NodeFileManagerProps) {
  const [currentPath, setCurrentPath] = useState<string>("/")
  const [entries, setEntries] = useState<NodeFileEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [statusBanner, setStatusBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  // Mkdir dialog state
  const [mkdirOpen, setMkdirOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Active transfers (uploads & downloads with progress and cancel support)
  const [activeTransfers, setActiveTransfers] = useState<ActiveTransfer[]>([])

  // Node-to-node transfer modal state
  const [transferEntry, setTransferEntry] = useState<NodeFileEntry | null>(null)
  const [otherNodes, setOtherNodes] = useState<TargetNodeOption[]>([])
  const [targetNodeId, setTargetNodeId] = useState<string>("")
  const [targetDestPath, setTargetDestPath] = useState<string>("/")
  const [transferring, setTransferring] = useState<boolean>(false)

  // Delete loading state
  const [deletingPath, setDeletingPath] = useState<string | null>(null)

  const fetchFiles = useCallback(
    async (pathToLoad: string = currentPath) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/nodes/${nodeId}/files?path=${encodeURIComponent(pathToLoad)}`,
          { credentials: "include" }
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || `Failed to list files (HTTP ${res.status})`)
        }
        setEntries(Array.isArray(data.entries) ? data.entries : [])
        setCurrentPath(data.path || pathToLoad || "/")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shared folder")
      } finally {
        setLoading(false)
      }
    },
    [nodeId, currentPath]
  )

  const fetchAvailableNodes = useCallback(async () => {
    try {
      let res = await fetch("/api/nodes", { credentials: "include" })
      let data = res.ok ? await res.json() : null
      if (!Array.isArray(data) || data.length === 0) {
        res = await fetch("/api/nodes/with-metrics", { credentials: "include" })
        data = res.ok ? await res.json() : []
      }
      if (Array.isArray(data)) {
        const filtered: TargetNodeOption[] = data
          .map((n: Record<string, unknown>) => ({
            id: String(n.id || n.ID || ""),
            hostname: String(n.hostname || n.name || n.Hostname || "Node"),
            ip_vpn: n.ip_vpn ? String(n.ip_vpn) : n.ipVpn ? String(n.ipVpn) : n.IPVPN ? String(n.IPVPN) : undefined,
            ip_local: n.ip_local ? String(n.ip_local) : n.ipLocal ? String(n.ipLocal) : n.IPLocal ? String(n.IPLocal) : undefined,
            is_local: Boolean(n.is_local ?? n.isLocal ?? n.IsLocal),
          }))
          .filter((n) => Boolean(n.id) && n.id !== nodeId)
        setOtherNodes(filtered)
        if (filtered.length > 0) {
          setTargetNodeId((prev) => (prev && filtered.some((f) => f.id === prev) ? prev : filtered[0].id))
        }
      }
    } catch {
      // ignore
    }
  }, [nodeId])

  useEffect(() => {
    fetchFiles("/")
    fetchAvailableNodes()
  }, [nodeId])

  const navigateTo = (nextPath: string) => {
    setStatusBanner(null)
    fetchFiles(nextPath)
  }

  const navigateUp = () => {
    if (currentPath === "/" || !currentPath) return
    const parts = currentPath.split("/").filter(Boolean)
    parts.pop()
    const parent = "/" + parts.join("/")
    navigateTo(parent)
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newFolderName.trim().replace(/^\/+|\/+$/g, "")
    if (!trimmed) return

    setCreatingFolder(true)
    setStatusBanner(null)
    try {
      const fullNewPath =
        currentPath === "/" ? `/${trimmed}` : `${currentPath.replace(/\/+$/, "")}/${trimmed}`
      const res = await fetch(`/api/nodes/${nodeId}/files/mkdir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ path: fullNewPath }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not create folder")
      }
      setNewFolderName("")
      setMkdirOpen(false)
      setStatusBanner({ type: "ok", text: `Folder "${trimmed}" created.` })
      await fetchFiles(currentPath)
    } catch (err) {
      setStatusBanner({
        type: "err",
        text: err instanceof Error ? err.message : "Failed to create folder",
      })
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setStatusBanner(null)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const transferId = `upload-${Date.now()}-${i}`
        let lastLoaded = 0
        let lastTime = Date.now()
        let speedStr = ""

        const formData = new FormData()
        formData.append("file", file)
        formData.append("path", currentPath)

        const xhr = new XMLHttpRequest()
        const cancel = () => {
          xhr.abort()
          setActiveTransfers((prev) => prev.filter((t) => t.id !== transferId))
          setStatusBanner({ type: "err", text: `Upload of "${file.name}" cancelled.` })
        }

        setActiveTransfers((prev) => [
          ...prev,
          {
            id: transferId,
            type: "upload",
            filename: file.name,
            progress: 0,
            loadedBytes: 0,
            totalBytes: file.size,
            speedStr: "Starting…",
            cancel,
          },
        ])

        try {
          await new Promise<void>((resolve, reject) => {
            xhr.upload.onprogress = (evt) => {
              if (evt.lengthComputable) {
                const now = Date.now()
                const elapsedSec = (now - lastTime) / 1000
                if (elapsedSec >= 0.5) {
                  const bytesDiff = evt.loaded - lastLoaded
                  const bytesPerSec = bytesDiff / elapsedSec
                  speedStr = `${formatBytes(bytesPerSec)}/s`
                  lastLoaded = evt.loaded
                  lastTime = now
                }

                const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100))
                setActiveTransfers((prev) =>
                  prev.map((t) =>
                    t.id === transferId
                      ? {
                          ...t,
                          progress: pct,
                          loadedBytes: evt.loaded,
                          totalBytes: evt.total,
                          speedStr: pct >= 100 ? "Guardando en nodo…" : (speedStr || t.speedStr),
                        }
                      : t
                  )
                )
              }
            }

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve()
              } else {
                try {
                  const data = JSON.parse(xhr.responseText)
                  reject(new Error(data.error || `Upload failed (HTTP ${xhr.status})`))
                } catch {
                  reject(new Error(`Upload failed (HTTP ${xhr.status})`))
                }
              }
            }

            xhr.onerror = () => reject(new Error("Network error during upload"))
            xhr.onabort = () => reject(new Error("Upload aborted"))

            xhr.open(
              "POST",
              `/api/nodes/${nodeId}/files/upload?path=${encodeURIComponent(currentPath)}`
            )
            xhr.withCredentials = true
            xhr.send(formData)
          })

          setActiveTransfers((prev) => prev.filter((t) => t.id !== transferId))
          setStatusBanner({
            type: "ok",
            text: `Uploaded "${file.name}" (${formatBytes(file.size)}) successfully.`,
          })
        } catch (err) {
          setActiveTransfers((prev) => prev.filter((t) => t.id !== transferId))
          if (err instanceof Error && err.message === "Upload aborted") {
            // Already handled
          } else {
            setStatusBanner({
              type: "err",
              text: err instanceof Error ? err.message : `Failed to upload ${file.name}`,
            })
          }
        }
      }
      await fetchFiles(currentPath)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async (entry: NodeFileEntry) => {
    const confirmMsg = entry.is_dir
      ? `Delete folder "${entry.name}" and all its contents?`
      : `Delete file "${entry.name}"?`
    if (!window.confirm(confirmMsg)) return

    setDeletingPath(entry.path)
    setStatusBanner(null)
    try {
      const res = await fetch(
        `/api/nodes/${nodeId}/files?path=${encodeURIComponent(entry.path)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Delete failed")
      }
      setStatusBanner({ type: "ok", text: `Deleted "${entry.name}".` })
      await fetchFiles(currentPath)
    } catch (err) {
      setStatusBanner({
        type: "err",
        text: err instanceof Error ? err.message : "Delete failed",
      })
    } finally {
      setDeletingPath(null)
    }
  }

  const handleDownload = async (entry: NodeFileEntry) => {
    const transferId = `download-${Date.now()}`
    const abortController = new AbortController()
    let lastLoaded = 0
    let lastTime = Date.now()
    let speedStr = ""

    const cancel = () => {
      abortController.abort()
      setActiveTransfers((prev) => prev.filter((t) => t.id !== transferId))
      setStatusBanner({ type: "err", text: `Download of "${entry.name}" cancelled.` })
    }

    setActiveTransfers((prev) => [
      ...prev,
      {
        id: transferId,
        type: "download",
        filename: entry.name,
        progress: 0,
        loadedBytes: 0,
        totalBytes: entry.size_bytes || 0,
        speedStr: "Connecting…",
        cancel,
      },
    ])

    try {
      const url = `/api/nodes/${nodeId}/files/download?path=${encodeURIComponent(entry.path)}`
      const res = await fetch(url, {
        signal: abortController.signal,
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Download failed (HTTP ${res.status})`)
      }

      const totalHeader = res.headers.get("Content-Length")
      const totalBytes = totalHeader ? parseInt(totalHeader, 10) : entry.size_bytes || 0

      if (!res.body) {
        throw new Error("No response body received")
      }

      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      let receivedBytes = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (value) {
          chunks.push(value)
          receivedBytes += value.length

          const now = Date.now()
          const elapsedSec = (now - lastTime) / 1000
          if (elapsedSec >= 0.5) {
            const bytesDiff = receivedBytes - lastLoaded
            const bytesPerSec = bytesDiff / elapsedSec
            speedStr = `${formatBytes(bytesPerSec)}/s`
            lastLoaded = receivedBytes
            lastTime = now
          }

          const pct = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0

          setActiveTransfers((prev) =>
            prev.map((t) =>
              t.id === transferId
                ? {
                    ...t,
                    progress: pct,
                    loadedBytes: receivedBytes,
                    totalBytes: totalBytes > 0 ? totalBytes : receivedBytes,
                    speedStr: speedStr || t.speedStr,
                  }
                : t
            )
          )
        }
      }

      // Trigger browser file save
      const blob = new Blob(chunks as BlobPart[], { type: "application/octet-stream" })
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = entry.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)

      setActiveTransfers((prev) => prev.filter((t) => t.id !== transferId))
      setStatusBanner({
        type: "ok",
        text: `Downloaded "${entry.name}" (${formatBytes(receivedBytes)}) successfully.`,
      })
    } catch (err) {
      setActiveTransfers((prev) => prev.filter((t) => t.id !== transferId))
      if (err instanceof Error && err.name === "AbortError") {
        // Cancelled by user
      } else {
        setStatusBanner({
          type: "err",
          text: err instanceof Error ? err.message : `Download failed for "${entry.name}"`,
        })
      }
    }
  }

  const openTransferDialog = (entry: NodeFileEntry) => {
    setTransferEntry(entry)
    setTargetDestPath(entry.path)
    fetchAvailableNodes()
  }

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferEntry || !targetNodeId) return

    setTransferring(true)
    setStatusBanner(null)
    try {
      const res = await fetch(`/api/nodes/${nodeId}/files/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          source_path: transferEntry.path,
          target_node_id: targetNodeId,
          target_path: targetDestPath.trim() || `/${transferEntry.name}`,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Node-to-node transfer failed")
      }
      const targetNode = otherNodes.find((n) => n.id === targetNodeId)
      setStatusBanner({
        type: "ok",
        text: `Transferred "${transferEntry.name}" (${formatBytes(transferEntry.size_bytes)}) to node "${
          targetNode?.hostname || targetNodeId
        }" at ${data.target_path || targetDestPath}.`,
      })
      setTransferEntry(null)
    } catch (err) {
      setStatusBanner({
        type: "err",
        text: err instanceof Error ? err.message : "Transfer between nodes failed",
      })
    } finally {
      setTransferring(false)
    }
  }

  const breadcrumbs = currentPath.split("/").filter(Boolean)

  return (
    <Card className="border-border/80 bg-card/80 shadow-lg">
      <CardHeader className="pb-4 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#70AEFF]/15 border border-[#70AEFF]/30 text-[#70AEFF]">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Node Shared Storage
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                >
                  /var/lib/autohost/shared
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Upload, download, organize, and transfer files directly between nodes over your Tailscale network.
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchFiles(currentPath)}
              disabled={loading}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMkdirOpen(true)}
              className="h-8 text-xs gap-1.5"
            >
              <FolderPlus className="h-3.5 w-3.5 text-amber-400" />
              New Folder
            </Button>
            <Button
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs gap-1.5 bg-[#70AEFF] hover:bg-[#5b9df5] text-slate-950 font-semibold"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading ? "Uploading…" : "Upload Files"}
            </Button>
          </div>
        </div>

        {/* Breadcrumb Bar */}
        <div className="flex items-center gap-1.5 pt-3 text-xs font-mono overflow-x-auto">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPath === "/"}
            onClick={navigateUp}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Up one directory"
          >
            <ArrowUpLeft className="h-3.5 w-3.5 mr-1" />
            Up
          </Button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={() => navigateTo("/")}
            className={`px-2 py-1 rounded hover:bg-muted transition-colors ${
              currentPath === "/" ? "text-[#70AEFF] font-semibold" : "text-muted-foreground"
            }`}
          >
            shared
          </button>
          {breadcrumbs.map((part, idx) => {
            const subPath = "/" + breadcrumbs.slice(0, idx + 1).join("/")
            const isLast = idx === breadcrumbs.length - 1
            return (
              <React.Fragment key={subPath}>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <button
                  type="button"
                  onClick={() => navigateTo(subPath)}
                  className={`px-2 py-1 rounded hover:bg-muted transition-colors truncate max-w-[180px] ${
                    isLast ? "text-[#70AEFF] font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {part}
                </button>
              </React.Fragment>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {statusBanner && (
          <div
            className={`px-4 py-2.5 text-xs flex items-center justify-between border-b ${
              statusBanner.type === "ok"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            <span className="flex items-center gap-2">
              {statusBanner.type === "ok" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {statusBanner.text}
            </span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-[11px] underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-xs text-destructive space-y-2">
            <AlertCircle className="h-6 w-6 mx-auto" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchFiles(currentPath)}>
              Retry
            </Button>
          </div>
        )}

        {!error && loading && (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-[#70AEFF]" />
            <span>Loading files from {nodeName || "node"}…</span>
          </div>
        )}

        {!error && !loading && entries.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/40 border border-border flex items-center justify-center text-muted-foreground">
              <Folder className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">This folder is empty</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Files placed in <code className="font-mono text-[#70AEFF]">/var/lib/autohost/shared</code> on this node or uploaded here are immediately accessible.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setMkdirOpen(true)} className="text-xs">
                <FolderPlus className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                Create Folder
              </Button>
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-[#70AEFF] hover:bg-[#5b9df5] text-slate-950 font-semibold"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload File
              </Button>
            </div>
          </div>
        )}

        {!error && !loading && entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-4 font-semibold">Name</th>
                  <th className="py-2.5 px-4 font-semibold">Size</th>
                  <th className="py-2.5 px-4 font-semibold hidden md:table-cell">Permissions</th>
                  <th className="py-2.5 px-4 font-semibold hidden sm:table-cell">Modified</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {entries.map((entry) => (
                  <tr
                    key={entry.path}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    <td className="py-2.5 px-4 font-medium">
                      {entry.is_dir ? (
                        <button
                          type="button"
                          onClick={() => navigateTo(entry.path)}
                          className="flex items-center gap-2.5 text-foreground hover:text-[#70AEFF] transition-colors text-left"
                        >
                          <Folder className="h-4 w-4 text-amber-400 fill-amber-400/20 shrink-0" />
                          <span className="font-mono">{entry.name}/</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2.5 text-foreground">
                          <FileText className="h-4 w-4 text-[#70AEFF] shrink-0" />
                          <span className="font-mono break-all">{entry.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground">
                      {entry.is_dir ? "—" : formatBytes(entry.size_bytes)}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground hidden md:table-cell">
                      {entry.mode || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground hidden sm:table-cell">
                      {entry.modified_at
                        ? new Date(entry.modified_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!entry.is_dir && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(entry)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                              title="Download file"
                            >
                              <Download className="h-3.5 w-3.5 text-[#70AEFF]" />
                              <span className="hidden lg:inline">Download</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTransferDialog(entry)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-emerald-400 gap-1"
                              title="Transfer file to another node over Tailscale"
                            >
                              <Send className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="hidden lg:inline">Transfer</span>
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingPath === entry.path}
                          onClick={() => handleDelete(entry)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          {deletingPath === entry.path ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Create Folder Modal */}
      <Dialog open={mkdirOpen} onOpenChange={setMkdirOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-amber-400" />
              Create New Folder
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a directory inside <code className="font-mono text-[#70AEFF]">{currentPath}</code>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <Input
              placeholder="Folder name (e.g. backups)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              className="font-mono text-xs"
            />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setMkdirOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creatingFolder || !newFolderName.trim()}
                className="bg-[#70AEFF] hover:bg-[#5b9df5] text-slate-950 font-semibold"
              >
                {creatingFolder ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Between Nodes Modal */}
      <Dialog open={Boolean(transferEntry)} onOpenChange={(open) => !open && setTransferEntry(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-emerald-400" />
              Transfer File Between Nodes
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send <code className="font-mono text-[#70AEFF]">{transferEntry?.name}</code> (
              {transferEntry ? formatBytes(transferEntry.size_bytes) : ""}) over your private Tailscale mesh to another node&apos;s shared folder.
            </DialogDescription>
          </DialogHeader>

          {otherNodes.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground text-center">
              No other nodes are registered yet. Enroll a second node to transfer files between nodes.
            </div>
          ) : (
            <form onSubmit={handleConfirmTransfer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Destination Node</label>
                <Select value={targetNodeId} onValueChange={setTargetNodeId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select destination node" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherNodes.map((n) => (
                      <SelectItem key={n.id} value={n.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Server className="h-3.5 w-3.5 text-[#70AEFF]" />
                          <span className="font-semibold">{n.hostname}</span>
                          {n.ip_vpn && (
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5">
                              <Shield className="h-2.5 w-2.5" />
                              {n.ip_vpn}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Destination Path (inside destination node&apos;s shared folder)
                </label>
                <Input
                  value={targetDestPath}
                  onChange={(e) => setTargetDestPath(e.target.value)}
                  placeholder={`/${transferEntry?.name || "file"}`}
                  className="h-9 font-mono text-xs"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTransferEntry(null)}
                  disabled={transferring}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={transferring || !targetNodeId}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold gap-1.5"
                >
                  {transferring ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {transferring ? "Transferring over Tailscale…" : "Transfer Now"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Active Transfers Widget (Progress Bar & Cancel) */}
      {activeTransfers.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-96 max-w-[calc(100vw-3rem)]">
          {activeTransfers.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-white/10 bg-[#0B0F17]/95 p-4 shadow-2xl backdrop-blur-md text-white transition-all animate-in fade-in slide-in-from-bottom-4"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 truncate">
                  {t.type === "upload" ? (
                    <Upload className="h-4 w-4 text-[#70AEFF] shrink-0" />
                  ) : (
                    <Download className="h-4 w-4 text-[#0DF8A2] shrink-0" />
                  )}
                  <span className="text-sm font-semibold truncate" title={t.filename}>
                    {t.filename}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={t.cancel}
                  className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                  title="Cancelar transferencia"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                </Button>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/10 rounded-full h-2 mb-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    t.type === "upload" ? "bg-[#70AEFF]" : "bg-[#0DF8A2]"
                  }`}
                  style={{ width: `${Math.max(2, t.progress)}%` }}
                />
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {t.totalBytes > 0
                    ? `${formatBytes(t.loadedBytes)} / ${formatBytes(t.totalBytes)} (${t.progress}%)`
                    : `${formatBytes(t.loadedBytes)}`}
                </span>
                <span className="font-mono text-gray-300">{t.speedStr}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

