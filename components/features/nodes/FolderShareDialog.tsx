"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Share2,
  Lock,
  Copy,
  Check,
  Trash2,
  Loader2,
  Eye,
  FileUp,
  Edit3,
  ExternalLink,
  Plus,
  Radio,
  KeyRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fetchWithAuth } from "@/lib/api/fetch-client";

export type SharePermission = "read" | "write" | "editor";

export interface SharedFolderLink {
  id: string;
  owner_id: string;
  node_id: string;
  node_name: string;
  folder_path: string;
  title: string;
  permission: SharePermission;
  password: string;
  funnel_enabled: boolean;
  funnel_url?: string;
  created_at: string;
}

interface FolderShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  nodeName?: string;
  initialFolderPath: string;
}

export function FolderShareDialog({
  open,
  onOpenChange,
  nodeId,
  nodeName,
  initialFolderPath,
}: FolderShareDialogProps) {
  const [shares, setShares] = useState<SharedFolderLink[]>([]);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [folderPath, setFolderPath] = useState(initialFolderPath || "/");
  const [title, setTitle] = useState("");
  const [permission, setPermission] = useState<SharePermission>("read");
  const [customPassword, setCustomPassword] = useState("");
  const [funnelEnabled, setFunnelEnabled] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFolderPath(initialFolderPath || "/");
    const baseName =
      initialFolderPath === "/" || !initialFolderPath
        ? `Archivos de ${nodeName || "Nodo"}`
        : initialFolderPath.split("/").filter(Boolean).pop() || "Carpeta";
    setTitle(baseName);
  }, [initialFolderPath, nodeName, open]);

  const fetchShares = useCallback(async () => {
    if (!nodeId) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        `/api/file-shares?node_id=${encodeURIComponent(nodeId)}`,
        { method: "GET" }
      );
      if (!res.ok) return;
      const data: SharedFolderLink[] = await res.json();
      setShares(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    if (open) {
      fetchShares();
    }
  }, [open, fetchShares]);

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/file-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          node_id: nodeId,
          folder_path: folderPath.trim() || "/",
          title: title.trim(),
          permission,
          password: customPassword.trim(), // empty = backend auto-generates AH-xxxx-xxxx
          funnel_enabled: funnelEnabled,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el enlace compartido");
      }
      setCustomPassword("");
      await fetchShares();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear enlace");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePermission = async (shareId: string, newPerm: SharePermission) => {
    try {
      await fetchWithAuth("/api/file-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          share_id: shareId,
          permission: newPerm,
        }),
      });
      await fetchShares();
    } catch {
      // ignore
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    setDeletingId(shareId);
    try {
      await fetchWithAuth("/api/file-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", share_id: shareId }),
      });
      await fetchShares();
    } finally {
      setDeletingId(null);
    }
  };

  const getPublicShareUrl = (s: SharedFolderLink) => {
    if (s.funnel_enabled && s.funnel_url) return s.funnel_url;
    if (typeof window !== "undefined") {
      return `${window.location.origin}/share/${s.id}`;
    }
    return `/share/${s.id}`;
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5 text-[#70AEFF]" />
            Compartir Carpeta con Contraseña y Permisos (Drive / Tailscale Funnel)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Genera un enlace público aislado para una carpeta específica o todo el nodo ({nodeName || nodeId}). Quien abra el enlace deberá ingresar la contraseña y solo tendrá acceso a la carpeta y permisos asignados.
          </DialogDescription>
        </DialogHeader>

        {/* Create New Share Form */}
        <form
          onSubmit={handleCreateShare}
          className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Carpeta a compartir (o / para todas)</Label>
              <Input
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/files/roms o /"
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Título visible del enlace</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. ROMs GameCube"
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Nivel de Permisos</Label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as SharePermission)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="read">
                  👁️ Lector (Solo ver, reproducir stream y descargar)
                </option>
                <option value="write">
                  📤 Escritura (Ver, descargar, crear carpetas y subir archivos)
                </option>
                <option value="editor">
                  ✏️ Editor (Control total en la carpeta: incluye eliminar)
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <KeyRound className="h-3 w-3 text-amber-400" />
                Contraseña (vacío = autogenerar por defecto)
              </Label>
              <Input
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Autogenerada (ej. AH-7k9m-4p2x)"
                className="font-mono text-xs h-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={funnelEnabled}
                onChange={(e) => setFunnelEnabled(e.target.checked)}
                className="rounded border-border"
              />
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              <span>Habilitar acceso vía Tailscale Funnel (<code>*.ts.net</code>)</span>
            </label>

            <Button
              type="submit"
              size="sm"
              disabled={creating}
              className="bg-[#70AEFF] hover:bg-[#5b9df5] text-slate-950 font-semibold gap-1.5"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Generar Link con Contraseña
            </Button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>

        {/* Active Shares List */}
        <div className="space-y-2.5 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Enlaces Compartidos Activos en este Nodo ({shares.length})
          </h4>

          {loading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              No hay carpetas compartidas en este nodo todavía.
            </div>
          ) : (
            <div className="space-y-2.5">
              {shares.map((s) => {
                const shareUrl = getPublicShareUrl(s);
                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{s.title}</span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            Ruta: {s.folder_path}
                          </Badge>
                          {s.funnel_enabled && (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                              <Radio className="h-2.5 w-2.5" />
                              Funnel
                            </Badge>
                          )}
                        </div>
                        <a
                          href={`/share/${s.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-[#70AEFF] hover:underline flex items-center gap-1 truncate"
                        >
                          {shareUrl}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          value={s.permission}
                          onChange={(e) =>
                            handleUpdatePermission(s.id, e.target.value as SharePermission)
                          }
                          className="h-7 rounded-md border border-input bg-background px-2 text-[11px]"
                        >
                          <option value="read">👁️ Lectura</option>
                          <option value="write">📤 Escritura</option>
                          <option value="editor">✏️ Editor</option>
                        </select>

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === s.id}
                          onClick={() => handleDeleteShare(s.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Revocar enlace"
                        >
                          {deletingId === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Password & Quick Copy Bar */}
                    <div className="flex items-center justify-between gap-2 flex-wrap rounded-lg bg-background/70 border border-border/60 px-3 py-1.5 text-xs">
                      <div className="flex items-center gap-2 font-mono">
                        <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="text-muted-foreground">Contraseña:</span>
                        <code className="font-bold text-amber-300">{s.password}</code>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyText(`url_${s.id}`, shareUrl)}
                          className="h-6 px-2 text-[11px] gap-1"
                        >
                          {copiedKey === `url_${s.id}` ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          Copiar Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyText(
                              `both_${s.id}`,
                              `Carpeta compartida: ${shareUrl}\nContraseña: ${s.password}`
                            )
                          }
                          className="h-6 px-2 text-[11px] gap-1"
                        >
                          {copiedKey === `both_${s.id}` ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          Copiar Link + Contraseña
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
