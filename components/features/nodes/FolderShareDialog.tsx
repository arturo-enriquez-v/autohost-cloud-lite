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
  RefreshCw,
  AlertTriangle,
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
  /** Only present in create/regenerate responses: the API stores a bcrypt hash and never returns it again. */
  password?: string;
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
  // Plaintext passwords received in this dialog session (create / regenerate). They are never
  // retrievable again from the API, so they only live in memory until the dialog closes.
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setRevealed({});
  }, [open]);

  useEffect(() => {
    setFolderPath(initialFolderPath || "/");
    const baseName =
      initialFolderPath === "/" || !initialFolderPath
        ? `${nodeName || "Node"} Files`
        : initialFolderPath.split("/").filter(Boolean).pop() || "Folder";
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
        throw new Error(data.error || "Could not create shared link");
      }
      if (data?.id && data?.password) {
        setRevealed((prev) => ({ ...prev, [data.id]: data.password }));
      }
      setCustomPassword("");
      await fetchShares();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
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

  const handleRegeneratePassword = async (shareId: string) => {
    setRegeneratingId(shareId);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/file-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", share_id: shareId, regenerate_password: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.password) {
        throw new Error(data.error || "Could not generate a new password");
      }
      setRevealed((prev) => ({ ...prev, [shareId]: data.password }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a new password");
    } finally {
      setRegeneratingId(null);
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
            Share Folder with Password & Permissions (Drive / Tailscale Funnel)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate an isolated public link for a specific folder or the entire node ({nodeName || nodeId}). Anyone opening the link must enter the password and will only have access to the assigned folder and permissions.
          </DialogDescription>
        </DialogHeader>

        {/* Create New Share Form */}
        <form
          onSubmit={handleCreateShare}
          className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Folder to share (or / for all)</Label>
              <Input
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/files/roms or /"
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Visible link title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. GameCube ROMs"
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Permission Level</Label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as SharePermission)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="read">
                  👁️ Reader (View, stream, and download only)
                </option>
                <option value="write">
                  📤 Writer (View, download, create folders, and upload files)
                </option>
                <option value="editor">
                  ✏️ Editor (Full folder control: includes delete)
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <KeyRound className="h-3 w-3 text-amber-400" />
                Password (blank = auto-generated by default)
              </Label>
              <Input
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Auto-generated (min. 8 characters if custom)"
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
              <span>Enable access via Tailscale Funnel (<code>*.ts.net</code>)</span>
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
              Generate Password Link
            </Button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>

        {/* Active Shares List */}
        <div className="space-y-2.5 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Shared Links on this Node ({shares.length})
          </h4>

          {loading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              No shared folders on this node yet.
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
                            Path: {s.folder_path}
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
                          <option value="read">👁️ Read</option>
                          <option value="write">📤 Write</option>
                          <option value="editor">✏️ Editor</option>
                        </select>

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === s.id}
                          onClick={() => handleDeleteShare(s.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Revoke link"
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
                        <span className="text-muted-foreground">Password:</span>
                        {revealed[s.id] ? (
                          <code className="font-bold text-amber-300">{revealed[s.id]}</code>
                        ) : (
                          <code className="text-muted-foreground tracking-widest">••••••••</code>
                        )}
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
                          Copy Link
                        </Button>
                        {revealed[s.id] ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyText(
                                `both_${s.id}`,
                                `Shared folder: ${shareUrl}\nPassword: ${revealed[s.id]}`
                              )
                            }
                            className="h-6 px-2 text-[11px] gap-1"
                          >
                            {copiedKey === `both_${s.id}` ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Copy Link + Password
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={regeneratingId === s.id}
                            onClick={() => handleRegeneratePassword(s.id)}
                            className="h-6 px-2 text-[11px] gap-1"
                            title="Passwords are stored hashed and cannot be shown again. Generate a new one (the old one stops working)."
                          >
                            {regeneratingId === s.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            New password
                          </Button>
                        )}
                      </div>
                    </div>
                    {revealed[s.id] && (
                      <p className="flex items-center gap-1.5 text-[11px] text-amber-400/90">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Copy this password now: only a secure hash is stored, so it cannot be shown again.
                      </p>
                    )}
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
