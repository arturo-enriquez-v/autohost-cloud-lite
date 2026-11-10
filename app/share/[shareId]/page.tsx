"use client"

import React, { use, useState, useEffect, useCallback, useRef } from "react"
import {
  Folder,
  FolderPlus,
  FileText,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  ArrowUpLeft,
  ChevronRight,
  Lock,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Play,
  Film,
  LayoutGrid,
  List,
  Search,
  Eye,
  Edit3,
  FileUp,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SharedFileEntry {
  name: string
  path: string
  is_dir: boolean
  size_bytes: number
  modified_at: string
  mode: string
}

type SharePermission = "read" | "write" | "editor"

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / Math.pow(1024, i)
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function isMediaFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  return [
    "mp4",
    "webm",
    "mov",
    "mkv",
    "avi",
    "m4v",
    "ogg",
    "ogv",
    "mp3",
    "wav",
    "flac",
    "aac",
  ].includes(ext)
}

export default function PublicSharePortalPage({
  params,
}: {
  params: Promise<{ shareId: string }>
}) {
  const { shareId } = use(params)

  // Public metadata before password unlock
  const [infoLoading, setInfoLoading] = useState(true)
  const [notFoundError, setNotFoundError] = useState<string | null>(null)
  const [shareTitle, setShareTitle] = useState<string>("Carpeta Compartida")
  const [nodeName, setNodeName] = useState<string>("")

  // Password gate state
  const [passwordInput, setPasswordInput] = useState("")
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [permission, setPermission] = useState<SharePermission>("read")

  // Explorer state (only active after unlock)
  const [currentPath, setCurrentPath] = useState<string>("/")
  const [entries, setEntries] = useState<SharedFileEntry[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")

  // Actions state (for write / editor permissions)
  const [mkdirOpen, setMkdirOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadFilename, setUploadFilename] = useState<string>("")
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const [streamingEntry, setStreamingEntry] = useState<SharedFileEntry | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const canWrite = permission === "write" || permission === "editor"
  const canDelete = permission === "editor"

  // 1. Load basic share info (does not expose files)
  useEffect(() => {
    async function loadInfo() {
      setInfoLoading(true)
      try {
        const res = await fetch(`/api/public-shares/${encodeURIComponent(shareId)}?mode=info`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setNotFoundError(data.error || "Este enlace compartido no existe o ha expirado.")
          return
        }
        setShareTitle(data.title || "Carpeta Compartida")
        setNodeName(data.node_name || "")

        // Check if session storage has an active token for this shareId
        const savedToken = sessionStorage.getItem(`ah_share_token_${shareId}`)
        const savedPerm = sessionStorage.getItem(`ah_share_perm_${shareId}`) as SharePermission | null
        if (savedToken) {
          setShareToken(savedToken)
          if (savedPerm) setPermission(savedPerm)
        }
      } catch {
        setNotFoundError("No se pudo conectar con el servidor.")
      } finally {
        setInfoLoading(false)
      }
    }
    loadInfo()
  }, [shareId])

  const fetchSharedFiles = useCallback(
    async (pathToLoad: string, tokenToUse: string) => {
      setFilesLoading(true)
      setFilesError(null)
      try {
        const res = await fetch(
          `/api/public-shares/${encodeURIComponent(shareId)}?mode=files&path=${encodeURIComponent(pathToLoad)}`,
          {
            headers: { "X-Share-Token": tokenToUse },
          }
        )
        const data = await res.json().catch(() => ({}))
        if (res.status === 401) {
          sessionStorage.removeItem(`ah_share_token_${shareId}`)
          setShareToken(null)
          setUnlockError("La sesión expiró. Ingresa la contraseña nuevamente.")
          return
        }
        if (!res.ok) {
          throw new Error(data.error || "No se pudieron cargar los archivos")
        }
        setEntries(Array.isArray(data.entries) ? data.entries : [])
        setCurrentPath(data.current_path || pathToLoad || "/")
        if (data.permission) {
          setPermission(data.permission as SharePermission)
        }
      } catch (err) {
        setFilesError(err instanceof Error ? err.message : "Error al leer carpeta")
      } finally {
        setFilesLoading(false)
      }
    },
    [shareId]
  )

  useEffect(() => {
    if (shareToken) {
      fetchSharedFiles("/", shareToken)
    }
  }, [shareToken, fetchSharedFiles])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput.trim()) return
    setUnlocking(true)
    setUnlockError(null)
    try {
      const res = await fetch(`/api/public-shares/${encodeURIComponent(shareId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlock",
          password: passwordInput.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.token) {
        throw new Error(data.error || "Contraseña incorrecta")
      }
      const perm = (data.share?.permission || "read") as SharePermission
      sessionStorage.setItem(`ah_share_token_${shareId}`, data.token)
      sessionStorage.setItem(`ah_share_perm_${shareId}`, perm)
      setPermission(perm)
      setShareToken(data.token)
      setPasswordInput("")
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : "Contraseña incorrecta")
    } finally {
      setUnlocking(false)
    }
  }

  const navigateTo = (nextPath: string) => {
    if (!shareToken) return
    fetchSharedFiles(nextPath, shareToken)
  }

  const navigateUp = () => {
    if (currentPath === "/" || !currentPath) return
    const parts = currentPath.split("/").filter(Boolean)
    parts.pop()
    navigateTo("/" + parts.join("/"))
  }

  const handleDownload = (entry: SharedFileEntry) => {
    if (!shareToken) return
    const url = `/api/public-shares/${encodeURIComponent(shareId)}/download?path=${encodeURIComponent(
      entry.path
    )}&st=${encodeURIComponent(shareToken)}`
    const a = document.createElement("a")
    a.href = url
    a.download = entry.name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shareToken || !canWrite) return
    const trimmed = newFolderName.trim().replace(/^\/+|\/+$/g, "")
    if (!trimmed) return

    setCreatingFolder(true)
    try {
      const targetPath = currentPath === "/" ? `/${trimmed}` : `${currentPath}/${trimmed}`
      const res = await fetch(`/api/public-shares/${encodeURIComponent(shareId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Share-Token": shareToken,
        },
        body: JSON.stringify({ action: "mkdir", path: targetPath }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear la carpeta")
      }
      setNewFolderName("")
      setMkdirOpen(false)
      await fetchSharedFiles(currentPath, shareToken)
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "Error al crear carpeta")
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !shareToken || !canWrite) return
    setUploading(true)
    setFilesError(null)
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        setUploadFilename(file.name)
        setUploadProgress(0)

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          const formData = new FormData()
          formData.append("path", currentPath)
          formData.append("file", file)

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable && ev.total > 0) {
              setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
            }
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Error al subir ${file.name}`))
            }
          }
          xhr.onerror = () => reject(new Error(`Error de red al subir ${file.name}`))

          xhr.open(
            "POST",
            `/api/public-shares/${encodeURIComponent(shareId)}/upload?path=${encodeURIComponent(
              currentPath
            )}&st=${encodeURIComponent(shareToken)}`
          )
          xhr.setRequestHeader("X-Share-Token", shareToken)
          xhr.send(formData)
        })
      }
      await fetchSharedFiles(currentPath, shareToken)
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "Error al subir archivo")
    } finally {
      setUploading(false)
      setUploadFilename("")
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (entry: SharedFileEntry) => {
    if (!shareToken || !canDelete) return
    if (!window.confirm(`¿Eliminar "${entry.name}" permanentemente?`)) return
    setDeletingPath(entry.path)
    try {
      const res = await fetch(`/api/public-shares/${encodeURIComponent(shareId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Share-Token": shareToken,
        },
        body: JSON.stringify({ action: "delete", path: entry.path }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "No se pudo eliminar")
      }
      await fetchSharedFiles(currentPath, shareToken)
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "Error al eliminar")
    } finally {
      setDeletingPath(null)
    }
  }

  const breadcrumbs = currentPath.split("/").filter(Boolean)
  const filteredEntries = entries.filter((e) =>
    searchQuery.trim()
      ? e.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      : true
  )

  if (infoLoading) {
    return (
      <div className="min-h-screen bg-[#070A10] text-foreground flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-[#70AEFF]" />
          <p className="text-xs font-mono">Verificando enlace compartido…</p>
        </div>
      </div>
    )
  }

  if (notFoundError) {
    return (
      <div className="min-h-screen bg-[#070A10] text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-destructive/40 bg-card/80 p-8 text-center space-y-3 shadow-2xl">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-bold">Enlace no disponible</h1>
          <p className="text-xs text-muted-foreground">{notFoundError}</p>
        </div>
      </div>
    )
  }

  // ─── PASSWORD GATE SCREEN (Before unlocking) ───────────────────────────────
  if (!shareToken) {
    return (
      <div className="min-h-screen bg-[#070A10] text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-border/80 bg-card/90 p-7 shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-[#70AEFF]/15 border border-[#70AEFF]/30 flex items-center justify-center text-[#70AEFF]">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">{shareTitle}</h1>
            <p className="text-xs text-muted-foreground">
              Esta carpeta compartida{nodeName ? ` en ${nodeName}` : ""} está protegida por contraseña.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Contraseña de acceso
              </label>
              <Input
                type="password"
                placeholder="Ingresa la contraseña (ej. AH-xxxx-xxxx)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                className="font-mono text-sm h-10"
              />
            </div>

            {unlockError && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {unlockError}
              </p>
            )}

            <Button
              type="submit"
              disabled={unlocking || !passwordInput.trim()}
              className="w-full h-10 bg-[#70AEFF] hover:bg-[#5b9df5] text-slate-950 font-semibold gap-2"
            >
              {unlocking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Desbloquear Carpeta
            </Button>
          </form>

          <p className="text-[11px] text-center text-muted-foreground/60">
            AutoHost Secure Share · Acceso aislado con permisos restringidos
          </p>
        </div>
      </div>
    )
  }

  // ─── ISOLATED SHARED FOLDER EXPLORER (After unlocking) ─────────────────────
  return (
    <div className="min-h-screen bg-[#070A10] text-foreground flex flex-col">
      {/* Top Bar (No dashboard links, strictly scoped to this share) */}
      <header className="border-b border-border/70 bg-card/80 backdrop-blur px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-[#70AEFF]/15 border border-[#70AEFF]/30 text-[#70AEFF]">
            <Folder className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-base truncate">{shareTitle}</h1>
              {permission === "read" && (
                <Badge variant="outline" className="text-[10px] gap-1 border-sky-500/40 text-sky-400">
                  <Eye className="h-3 w-3" />
                  Solo Lectura
                </Badge>
              )}
              {permission === "write" && (
                <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-400">
                  <FileUp className="h-3 w-3" />
                  Lectura y Escritura
                </Badge>
              )}
              {permission === "editor" && (
                <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-400">
                  <Edit3 className="h-3 w-3" />
                  Editor
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Nodo: <span className="font-mono text-foreground/80">{nodeName || "AutoHost"}</span> · Sesión cifrada vía Tailscale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar archivo…"
              className="h-8 pl-8 pr-3 text-xs w-44 bg-background/60"
            />
          </div>

          <div className="inline-flex items-center rounded-lg border border-border bg-background/60 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md ${
                viewMode === "grid"
                  ? "bg-[#70AEFF]/20 text-[#70AEFF]"
                  : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md ${
                viewMode === "list"
                  ? "bg-[#70AEFF]/20 text-[#70AEFF]"
                  : "text-muted-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSharedFiles(currentPath, shareToken)}
            disabled={filesLoading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${filesLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          {canWrite && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUploadFiles(e.target.files)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMkdirOpen(true)}
                className="h-8 text-xs gap-1.5"
              >
                <FolderPlus className="h-3.5 w-3.5 text-amber-400" />
                Nueva Carpeta
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
                {uploading ? `Subiendo (${uploadProgress}%)` : "Subir Archivo"}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem(`ah_share_token_${shareId}`)
              setShareToken(null)
            }}
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
          >
            <Lock className="h-3.5 w-3.5 mr-1" />
            Bloquear
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Breadcrumb bar */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-xs font-mono overflow-x-auto">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPath === "/"}
            onClick={navigateUp}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowUpLeft className="h-3.5 w-3.5 mr-1" />
            Subir
          </Button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={() => navigateTo("/")}
            className={`px-2 py-1 rounded hover:bg-muted ${
              currentPath === "/" ? "text-[#70AEFF] font-semibold" : "text-muted-foreground"
            }`}
          >
            {shareTitle}
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
                  className={`px-2 py-1 rounded hover:bg-muted truncate max-w-[180px] ${
                    isLast ? "text-[#70AEFF] font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {part}
                </button>
              </React.Fragment>
            )
          })}
        </div>

        {uploading && (
          <div className="rounded-xl border border-[#70AEFF]/40 bg-[#70AEFF]/10 p-3 flex items-center justify-between gap-4 text-xs">
            <span className="font-mono truncate">Subiendo: {uploadFilename}</span>
            <span className="font-mono font-bold text-[#70AEFF]">{uploadProgress}%</span>
          </div>
        )}

        {filesError && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive flex items-center justify-between">
            <span>{filesError}</span>
            <Button variant="ghost" size="sm" onClick={() => setFilesError(null)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="rounded-2xl border border-border/80 bg-card/80 shadow-lg overflow-hidden">
          {filesLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-[#70AEFF]" />
              <span>Cargando contenido…</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-16 text-center space-y-2 text-muted-foreground">
              <Folder className="h-10 w-10 mx-auto opacity-40" />
              <p className="text-sm font-medium text-foreground">Esta carpeta está vacía</p>
              {canWrite && (
                <p className="text-xs">Puedes subir archivos o crear carpetas usando los botones superiores.</p>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.path}
                  onClick={() => {
                    if (entry.is_dir) navigateTo(entry.path)
                  }}
                  onDoubleClick={() => {
                    if (!entry.is_dir && isMediaFile(entry.name)) setStreamingEntry(entry)
                  }}
                  className={`group rounded-xl border border-border/60 bg-background/40 hover:bg-muted/30 hover:border-[#70AEFF]/40 p-3.5 transition-all flex flex-col justify-between gap-3 ${
                    entry.is_dir ? "cursor-pointer" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                      {entry.is_dir ? (
                        <Folder className="h-7 w-7 text-amber-400 fill-amber-400/20" />
                      ) : isMediaFile(entry.name) ? (
                        <Film className="h-7 w-7 text-emerald-400" />
                      ) : (
                        <FileText className="h-7 w-7 text-[#70AEFF]" />
                      )}
                    </div>

                    <div
                      className="flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!entry.is_dir && isMediaFile(entry.name) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setStreamingEntry(entry)}
                          className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/15"
                          title="Reproducir"
                        >
                          <Play className="h-3.5 w-3.5 fill-emerald-400" />
                        </Button>
                      )}
                      {!entry.is_dir && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(entry)}
                          className="h-7 w-7 text-[#70AEFF] hover:bg-[#70AEFF]/15"
                          title="Descargar"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingPath === entry.path}
                          onClick={() => handleDelete(entry)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Eliminar"
                        >
                          {deletingPath === entry.path ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-medium font-mono truncate" title={entry.name}>
                      {entry.name}
                      {entry.is_dir ? "/" : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {entry.is_dir ? "Carpeta" : formatBytes(entry.size_bytes)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-4 font-semibold">Nombre</th>
                    <th className="py-2.5 px-4 font-semibold">Tamaño</th>
                    <th className="py-2.5 px-4 font-semibold hidden sm:table-cell">Modificado</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.path} className="hover:bg-muted/20">
                      <td className="py-2.5 px-4 font-medium">
                        {entry.is_dir ? (
                          <button
                            type="button"
                            onClick={() => navigateTo(entry.path)}
                            className="flex items-center gap-2.5 hover:text-[#70AEFF]"
                          >
                            <Folder className="h-4 w-4 text-amber-400 fill-amber-400/20" />
                            <span className="font-mono">{entry.name}/</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            {isMediaFile(entry.name) ? (
                              <Film className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <FileText className="h-4 w-4 text-[#70AEFF]" />
                            )}
                            <span className="font-mono">{entry.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">
                        {entry.is_dir ? "—" : formatBytes(entry.size_bytes)}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground hidden sm:table-cell">
                        {entry.modified_at
                          ? new Date(entry.modified_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!entry.is_dir && isMediaFile(entry.name) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStreamingEntry(entry)}
                              className="h-7 px-2 text-xs text-emerald-400"
                            >
                              <Play className="h-3.5 w-3.5 mr-1 fill-emerald-400" />
                              Play
                            </Button>
                          )}
                          {!entry.is_dir && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(entry)}
                              className="h-7 px-2 text-xs text-[#70AEFF]"
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              Descargar
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingPath === entry.path}
                              onClick={() => handleDelete(entry)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create Folder Modal (only for write/editor) */}
      <Dialog open={mkdirOpen} onOpenChange={setMkdirOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-amber-400" />
              Nueva Carpeta
            </DialogTitle>
            <DialogDescription className="text-xs">
              Crear carpeta dentro de <code className="font-mono text-[#70AEFF]">{currentPath}</code>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <Input
              placeholder="Nombre de la carpeta"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              className="font-mono text-xs"
            />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setMkdirOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creatingFolder || !newFolderName.trim()}
                className="bg-[#70AEFF] hover:bg-[#5b9df5] text-slate-950 font-semibold"
              >
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Video/Audio Streaming Player Dialog */}
      <Dialog open={!!streamingEntry} onOpenChange={(open) => !open && setStreamingEntry(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-950 border-white/10 text-white">
          <DialogHeader className="p-4 bg-slate-900/90 border-b border-white/10">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold truncate">
              <Film className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="truncate">{streamingEntry?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {streamingEntry && shareToken && (
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <video
                key={streamingEntry.path}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
                src={`/api/public-shares/${encodeURIComponent(
                  shareId
                )}/stream?path=${encodeURIComponent(streamingEntry.path)}&st=${encodeURIComponent(
                  shareToken
                )}`}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
