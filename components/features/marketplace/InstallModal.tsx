"use client";

import { useState } from "react";
import { Download, CheckCircle2, XCircle, Loader2, Search, Server } from "lucide-react";
import type { AppCatalogEntry, AppEnvVar, Node } from "@/lib/types";
import { cn } from "@/lib/utils";

interface InstallModalProps {
  app: AppCatalogEntry;
  nodes: Node[];
  onClose: () => void;
  onDeploy: (nodeId: string, appName: string, envVars: Record<string, string>) => Promise<unknown>;
  onSuccess: () => void;
}

export function InstallModal({ app, nodes, onClose, onDeploy, onSuccess }: InstallModalProps) {
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id ?? "");
  const [nodeSearch, setNodeSearch] = useState("");
  const [envValues, setEnvValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    app.env_vars.forEach((v) => {
      init[v.key] = v.default ?? "";
    });
    return init;
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRequiredFilled = app.env_vars
    .filter((v) => v.required)
    .every((v) => envValues[v.key]?.trim() !== "");

  const filteredNodes = nodes.filter((n) => {
    const q = nodeSearch.toLowerCase();
    return (
      (n.hostname ?? "").toLowerCase().includes(q) ||
      (n.ipLocal ?? "").toLowerCase().includes(q)
    );
  });

  async function handleDeploy() {
    if (!selectedNodeId) return;
    setIsDeploying(true);
    setError(null);
    try {
      await onDeploy(selectedNodeId, app.name, envValues);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsDeploying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Install {app.display_name}</h3>
            <p className="text-xs text-muted-foreground">{app.description}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-4">
          {/* Node selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Node</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search nodes…"
                value={nodeSearch}
                onChange={(e) => setNodeSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {filteredNodes.map((n, i) => (
                <button
                  key={n.id ?? n.hostname ?? i}
                  type="button"
                  onClick={() => setSelectedNodeId(n.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    selectedNodeId === n.id && "bg-primary/10 text-primary"
                  )}
                >
                  <Server className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{n.hostname ?? n.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{n.ipLocal ?? "—"}</p>
                  </div>
                  {selectedNodeId === n.id && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))}
              {filteredNodes.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No nodes match your search</p>
              )}
            </div>
          </div>

          {/* Env vars */}
          {app.env_vars.map((v: AppEnvVar) => (
            <div key={v.key} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {v.label}
                {v.required && <span className="ml-1 text-destructive">*</span>}
              </label>
              {v.description && (
                <p className="text-xs text-muted-foreground">{v.description}</p>
              )}
              <input
                type={v.secret ? "password" : "text"}
                value={envValues[v.key] ?? ""}
                onChange={(e) =>
                  setEnvValues((prev) => ({ ...prev, [v.key]: e.target.value }))
                }
                placeholder={v.default ?? v.key}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            disabled={isDeploying}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDeploy}
            disabled={isDeploying || !allRequiredFilled || !selectedNodeId}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isDeploying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deploying…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Deploy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
