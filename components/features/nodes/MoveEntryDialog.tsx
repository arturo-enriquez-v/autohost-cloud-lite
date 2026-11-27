// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowUp, ChevronRight, Folder, FolderInput, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { canMoveInto, parentDir } from "@/lib/utils/file-paths"

interface MovableEntry {
  name: string
  path: string
  is_dir: boolean
}

interface MoveEntryDialogProps {
  nodeId: string
  nodeName?: string
  entry: MovableEntry | null
  onClose: () => void
  /** Moves the entry into targetDir; resolves to true when it worked (the dialog then closes). */
  onMove: (targetDir: string) => Promise<boolean>
}

/** Picks a destination folder in the same node's shared folder for a file or folder. */
export function MoveEntryDialog({ nodeId, nodeName, entry, onClose, onMove }: MoveEntryDialogProps) {
  const [dir, setDir] = useState("/")
  const [folders, setFolders] = useState<MovableEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)

  const load = useCallback(
    async (path: string) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/nodes/${nodeId}/files?path=${encodeURIComponent(path)}`, { credentials: "include" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `Could not list ${path}`)
        const entries: MovableEntry[] = Array.isArray(data.entries) ? data.entries : []
        setFolders(entries.filter((e) => e.is_dir))
        setDir(data.path || path)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not list the folder")
      } finally {
        setLoading(false)
      }
    },
    [nodeId]
  )

  // Start browsing at the folder that holds the item.
  useEffect(() => {
    if (entry) load(parentDir(entry.path))
  }, [entry, load])

  if (!entry) return null
  const allowed = canMoveInto(entry, dir)
  const crumbs = dir.split("/").filter(Boolean)

  const confirm = async () => {
    setMoving(true)
    const ok = await onMove(dir)
    setMoving(false)
    if (ok) onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !moving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-4 w-4 text-[#70AEFF]" />
            Move {entry.is_dir ? "folder" : "file"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Choose where to move <code className="font-mono text-[#70AEFF]">{entry.name}</code> on this node.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-0.5 rounded-md border bg-muted/30 px-2 py-1.5 text-xs">
          <button type="button" onClick={() => load("/")} className="rounded px-1.5 py-0.5 hover:bg-muted">
            {nodeName || "shared"}
          </button>
          {crumbs.map((part, i) => {
            const sub = "/" + crumbs.slice(0, i + 1).join("/")
            return (
              <span key={sub} className="flex items-center">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <button type="button" onClick={() => load(sub)} className="max-w-40 truncate rounded px-1.5 py-0.5 hover:bg-muted">
                  {part}
                </button>
              </span>
            )
          })}
        </div>

        <div className="h-64 overflow-y-auto rounded-md border">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="p-3 text-xs text-destructive">{error}</p>
          ) : (
            <ul className="divide-y divide-border/40 text-sm">
              {dir !== "/" && (
                <li>
                  <button
                    type="button"
                    onClick={() => load(parentDir(dir))}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:bg-muted/40"
                  >
                    <ArrowUp className="h-4 w-4" /> ..
                  </button>
                </li>
              )}
              {folders.map((f) => {
                // The folder being moved (and anything inside it) cannot be opened as a destination.
                const isSelf = entry.is_dir && (f.path === entry.path || f.path.startsWith(entry.path + "/"))
                return (
                  <li key={f.path}>
                    <button
                      type="button"
                      disabled={isSelf}
                      onClick={() => load(f.path)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
                      title={isSelf ? "A folder cannot be moved inside itself" : undefined}
                    >
                      <Folder className="h-4 w-4 shrink-0 fill-amber-400/20 text-amber-400" />
                      <span className="truncate font-mono text-xs">{f.name}/</span>
                    </button>
                  </li>
                )
              })}
              {folders.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted-foreground">No subfolders here.</li>}
            </ul>
          )}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {allowed ? (
              <>
                Into <code className="font-mono">{dir}</code>
              </>
            ) : (
              "Open the folder to move it into"
            )}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={moving}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirm}
              disabled={!allowed || moving || loading}
              className="bg-[#70AEFF] font-semibold text-slate-950 hover:bg-[#5b9df5]"
            >
              {moving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Move here
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
