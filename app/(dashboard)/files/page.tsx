"use client"

import React, { useState, useCallback, useEffect } from "react"
import {
  Folder,
  FolderOpen,
  Server,
  HardDrive,
  ChevronRight,
  ChevronDown,
  Loader2,
  Shield,
  RefreshCw,
  FileText,
  Film,
  Layers,
} from "lucide-react"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import {
  NodeFileManager,
  type NodeFileEntry,
} from "@/components/features/nodes/NodeFileManager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Key format: `${nodeId}:${dirPath}` -> list of entries in that directory
type FolderCacheMap = Record<string, NodeFileEntry[]>

export default function GlobalFilesExplorerPage() {
  const { nodes, isLoading: nodesLoading, refresh: refreshNodes } = useNodes()

  // Currently selected node (null = root "All Nodes / Network Drives" view)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string>("/")

  // Tree expansion state: keys are `node:${nodeId}` or `dir:${nodeId}:${path}`
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({})
  const [folderCache, setFolderCache] = useState<FolderCacheMap>({})

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  const loadDirectoryForTree = useCallback(
    async (nodeId: string, dirPath: string) => {
      const cacheKey = `${nodeId}:${dirPath}`
      setLoadingKeys((prev) => ({ ...prev, [cacheKey]: true }))
      try {
        const res = await fetch(
          `/api/nodes/${nodeId}/files?path=${encodeURIComponent(dirPath)}`,
          { credentials: "include" }
        )
        if (!res.ok) return
        const data = await res.json().catch(() => ({}))
        const list: NodeFileEntry[] = Array.isArray(data.entries) ? data.entries : []
        setFolderCache((prev) => ({ ...prev, [cacheKey]: list }))
      } catch {
        // ignore tree preload errors
      } finally {
        setLoadingKeys((prev) => ({ ...prev, [cacheKey]: false }))
      }
    },
    []
  )

  // Preload root "/" folders for online nodes so the tree and volume cards feel instant
  useEffect(() => {
    nodes.forEach((n) => {
      if (n.status === "online" && !folderCache[`${n.id}:/`]) {
        loadDirectoryForTree(n.id, "/")
      }
    })
  }, [nodes, folderCache, loadDirectoryForTree])

  const handleToggleNodeTree = (nodeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const key = `node:${nodeId}`
    const nextExpanded = !expandedKeys[key]
    setExpandedKeys((prev) => ({ ...prev, [key]: nextExpanded }))
    if (nextExpanded && !folderCache[`${nodeId}:/`]) {
      loadDirectoryForTree(nodeId, "/")
    }
  }

  const handleSelectNode = (nodeId: string, path: string = "/") => {
    setSelectedNodeId(nodeId)
    setSelectedPath(path)
    // Auto-expand node in tree
    setExpandedKeys((prev) => ({ ...prev, [`node:${nodeId}`]: true }))
    if (!folderCache[`${nodeId}:${path}`]) {
      loadDirectoryForTree(nodeId, path)
    }
  }

  const handleToggleSubfolder = (
    nodeId: string,
    dirPath: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation()
    const key = `dir:${nodeId}:${dirPath}`
    const nextExpanded = !expandedKeys[key]
    setExpandedKeys((prev) => ({ ...prev, [key]: nextExpanded }))
    if (nextExpanded && !folderCache[`${nodeId}:${dirPath}`]) {
      loadDirectoryForTree(nodeId, dirPath)
    }
  }

  // Synchronize tree cache and expansion when user navigates inside NodeFileManager
  const handleMainPathChange = useCallback(
    (newPath: string, newEntries: NodeFileEntry[]) => {
      setSelectedPath(newPath)
      if (!selectedNodeId) return
      const cacheKey = `${selectedNodeId}:${newPath}`
      setFolderCache((prev) => ({ ...prev, [cacheKey]: newEntries }))

      // Ensure parent folders along newPath are expanded in the sidebar tree
      const parts = newPath.split("/").filter(Boolean)
      const updates: Record<string, boolean> = {
        [`node:${selectedNodeId}`]: true,
      }
      parts.forEach((_, idx) => {
        const sub = "/" + parts.slice(0, idx + 1).join("/")
        updates[`dir:${selectedNodeId}:${sub}`] = true
      })
      setExpandedKeys((prev) => ({ ...prev, ...updates }))
    },
    [selectedNodeId]
  )

  // Recursive renderer for subfolders & files inside a node in the left tree
  const renderDirectoryTree = (nodeId: string, parentPath: string, depth: number) => {
    const cacheKey = `${nodeId}:${parentPath}`
    const entries = folderCache[cacheKey] || []
    const isLoading = loadingKeys[cacheKey]

    if (isLoading && entries.length === 0) {
      return (
        <div
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
          className="py-1.5 flex items-center gap-2 text-[11px] text-muted-foreground"
        >
          <Loader2 className="h-3 w-3 animate-spin text-[#70AEFF]" />
          <span>Cargando…</span>
        </div>
      )
    }

    if (entries.length === 0) {
      return (
        <div
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
          className="py-1 text-[11px] text-muted-foreground/60 italic"
        >
          (vacío)
        </div>
      )
    }

    const dirs = entries.filter((e) => e.is_dir)
    const files = entries.filter((e) => !e.is_dir)

    return (
      <div className="space-y-0.5">
        {dirs.map((dir) => {
          const dirKey = `dir:${nodeId}:${dir.path}`
          const isExpanded = Boolean(expandedKeys[dirKey])
          const isSelected =
            selectedNodeId === nodeId && selectedPath === dir.path

          return (
            <div key={dir.path}>
              <div
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
                onClick={() => {
                  handleSelectNode(nodeId, dir.path)
                  setExpandedKeys((prev) => ({ ...prev, [dirKey]: true }))
                }}
                className={cn(
                  "group flex items-center gap-1.5 py-1.5 pr-2 rounded-lg text-xs cursor-pointer transition-colors select-none",
                  isSelected
                    ? "bg-[#70AEFF]/20 text-[#70AEFF] font-semibold"
                    : "text-foreground/85 hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <button
                  type="button"
                  onClick={(e) => handleToggleSubfolder(nodeId, dir.path, e)}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
                {isExpanded ? (
                  <FolderOpen className="h-3.5 w-3.5 text-amber-400 fill-amber-400/20 shrink-0" />
                ) : (
                  <Folder className="h-3.5 w-3.5 text-amber-400 fill-amber-400/20 shrink-0" />
                )}
                <span className="truncate font-mono text-[11px]">{dir.name}</span>
              </div>

              {isExpanded && renderDirectoryTree(nodeId, dir.path, depth + 1)}
            </div>
          )
        })}

        {files.map((file) => {
          const ext = file.name.split(".").pop()?.toLowerCase() || ""
          const isMedia = [
            "mp4",
            "webm",
            "mov",
            "mkv",
            "avi",
            "m4v",
            "mp3",
            "wav",
            "flac",
          ].includes(ext)
          return (
            <div
              key={file.path}
              style={{ paddingLeft: `${depth * 14 + 26}px` }}
              onClick={() => handleSelectNode(nodeId, parentPath)}
              className="flex items-center gap-1.5 py-1 pr-2 rounded-lg text-[11px] text-muted-foreground hover:bg-muted/40 hover:text-foreground cursor-pointer transition-colors truncate"
              title={file.name}
            >
              {isMedia ? (
                <Film className="h-3 w-3 text-emerald-400 shrink-0" />
              ) : (
                <FileText className="h-3 w-3 text-[#70AEFF]/80 shrink-0" />
              )}
              <span className="truncate font-mono">{file.name}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <FolderOpen className="h-6 w-6 text-[#70AEFF]" />
            Explorador de Archivos Multi-Nodo
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Navega tus nodos como unidades de red, explora carpetas, reproduce streams de video y transfiere archivos por Tailscale.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedNodeId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedNodeId(null)}
              className="h-8 text-xs gap-1.5"
            >
              <Layers className="h-3.5 w-3.5 text-[#70AEFF]" />
              Ver Todos los Nodos
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshNodes()
              if (selectedNodeId) {
                loadDirectoryForTree(selectedNodeId, selectedPath)
              }
            }}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Main Split Explorer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Left Pane: Node & Folder Tree */}
        <div className="rounded-xl border border-border/80 bg-card/80 shadow-lg overflow-hidden">
          <div className="px-3.5 py-3 border-b border-border/60 flex items-center justify-between bg-muted/20">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-[#70AEFF]" />
              Nodos y Carpetas
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {nodes.length} nodos
            </Badge>
          </div>

          <div className="p-2 max-h-[calc(100vh-220px)] overflow-y-auto space-y-1">
            {/* Root "All Nodes" item */}
            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors",
                selectedNodeId === null
                  ? "bg-[#70AEFF]/20 text-[#70AEFF] font-semibold"
                  : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Layers className="h-4 w-4 text-[#70AEFF] shrink-0" />
              <span className="truncate">Todos los Nodos (Unidades)</span>
            </button>

            <div className="my-1.5 border-t border-border/50" />

            {nodesLoading && nodes.length === 0 ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-[#70AEFF]" />
                <span>Cargando nodos…</span>
              </div>
            ) : (
              nodes.map((node) => {
                const nodeKey = `node:${node.id}`
                const isExpanded = Boolean(expandedKeys[nodeKey])
                const isNodeRootSelected =
                  selectedNodeId === node.id && selectedPath === "/"
                const isOnline = node.status === "online"

                return (
                  <div key={node.id} className="space-y-0.5">
                    <div
                      onClick={() => handleSelectNode(node.id, "/")}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs cursor-pointer transition-colors select-none",
                        isNodeRootSelected
                          ? "bg-[#70AEFF]/20 text-[#70AEFF] font-semibold"
                          : selectedNodeId === node.id
                          ? "bg-muted/40 text-foreground font-medium"
                          : "text-foreground/85 hover:bg-muted/60"
                      )}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleToggleNodeTree(node.id, e)}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <div className="relative shrink-0">
                        <Server className="h-4 w-4 text-[#70AEFF]" />
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-background",
                            isOnline ? "bg-emerald-400" : "bg-rose-500"
                          )}
                        />
                      </div>

                      <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                        <span className="truncate">{node.name}</span>
                        {node.isLocal && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#70AEFF]/15 text-[#70AEFF] shrink-0">
                            Master
                          </span>
                        )}
                      </div>
                    </div>

                    {isExpanded && renderDirectoryTree(node.id, "/", 1)}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Pane: Either "All Node Volumes" or Selected Node's File Manager */}
        <div className="min-w-0">
          {selectedNodeId === null ? (
            <div className="rounded-xl border border-border/80 bg-card/80 shadow-lg p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-[#70AEFF]" />
                    Unidades de Almacenamiento por Nodo
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Selecciona un nodo para abrir sus carpetas y archivos compartidos (<code>/var/lib/autohost/shared</code>).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {nodes.map((node) => {
                  const isOnline = node.status === "online"
                  const rootEntries = folderCache[`${node.id}:/`] || []
                  const folderCount = rootEntries.filter((e) => e.is_dir).length
                  const fileCount = rootEntries.filter((e) => !e.is_dir).length
                  const tailscaleIP = (node.ipVpn || node.ipLocal || "").split("/")[0]

                  return (
                    <div
                      key={node.id}
                      onClick={() => handleSelectNode(node.id, "/")}
                      className="group rounded-xl border border-border/70 bg-background/50 hover:bg-muted/30 hover:border-[#70AEFF]/50 p-4 cursor-pointer transition-all shadow-sm flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-3 rounded-xl bg-[#70AEFF]/15 border border-[#70AEFF]/30 text-[#70AEFF] group-hover:scale-105 transition-transform">
                            <HardDrive className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm truncate group-hover:text-[#70AEFF] transition-colors">
                                {node.name}
                              </h3>
                              {node.isLocal && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 border-[#70AEFF]/40 text-[#70AEFF]"
                                >
                                  Master
                                </Badge>
                              )}
                            </div>
                            {tailscaleIP && (
                              <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                                <Shield className="h-3 w-3" />
                                {tailscaleIP}
                              </p>
                            )}
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] shrink-0",
                            isOnline
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          )}
                        >
                          {isOnline ? "Online" : "Offline"}
                        </Badge>
                      </div>

                      {/* Disk Usage Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Uso de disco del nodo</span>
                          <span className="font-mono font-medium text-foreground">
                            {(node.disk ?? 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              (node.disk ?? 0) > 85
                                ? "bg-rose-500"
                                : (node.disk ?? 0) > 65
                                ? "bg-amber-400"
                                : "bg-[#70AEFF]"
                            )}
                            style={{
                              width: `${Math.min(100, Math.max(3, node.disk ?? 0))}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Quick Folder Summary & Action */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2 font-mono text-[11px]">
                          <Folder className="h-3.5 w-3.5 text-amber-400 fill-amber-400/20" />
                          {folderCount} carpetas · {fileCount} archivos
                        </span>
                        <span className="text-[#70AEFF] font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Abrir
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <NodeFileManager
              key={selectedNodeId}
              nodeId={selectedNodeId}
              nodeName={selectedNode?.name || selectedNode?.hostname}
              externalPath={selectedPath}
              onPathChange={handleMainPathChange}
              onBackToAllNodes={() => setSelectedNodeId(null)}
              defaultViewMode="grid"
            />
          )}
        </div>
      </div>
    </div>
  )
}
