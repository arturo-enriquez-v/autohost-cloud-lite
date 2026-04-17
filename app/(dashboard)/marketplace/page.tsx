"use client";

import { useState, useEffect } from "react";
import { Package, Download, CheckCircle2, XCircle, Loader2, Search, Server } from "lucide-react";
import { fetchWithAuth } from "@/lib/api/fetch-client";
import type { AppCatalogEntry, AppEnvVar, Node, MarketplaceApp, DeployAppResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    productivity: "Productivity",
    database: "Database",
    storage: "Storage",
  };
  return map[cat] ?? cat;
}

function statusBadge(status: MarketplaceApp["status"]) {
  const cfg = {
    installing: { label: "Installing", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    running:    { label: "Running",    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    failed:     { label: "Failed",     color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  } as const;
  const s = cfg[status] ?? { label: status, color: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", s.color)}>{s.label}</span>
  );
}

// ─── Install Modal ───────────────────────────────────────────────────────────

interface InstallModalProps {
  app: AppCatalogEntry;
  nodes: Node[];
  onClose: () => void;
  onSuccess: () => void;
}

function InstallModal({ app, nodes, onClose, onSuccess }: InstallModalProps) {
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

  async function handleDeploy() {
    if (!selectedNodeId) return;
    setIsDeploying(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/marketplace/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node_id: selectedNodeId,
          app_name: app.name,
          env_vars: envValues,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      const data: DeployAppResponse = await res.json();
      console.log("[marketplace] deploy started:", data);
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
              {nodes
                .filter((n) => {
                  const q = nodeSearch.toLowerCase();
                  return (
                    (n.hostname ?? "").toLowerCase().includes(q) ||
                    (n.ipLocal ?? "").toLowerCase().includes(q)
                  );
                })
                .map((n, i) => (
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
              {nodes.filter((n) => {
                const q = nodeSearch.toLowerCase();
                return (
                  (n.hostname ?? "").toLowerCase().includes(q) ||
                  (n.ipLocal ?? "").toLowerCase().includes(q)
                );
              }).length === 0 && (
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

// ─── App Card ────────────────────────────────────────────────────────────────

interface AppCardProps {
  app: AppCatalogEntry;
  installedOn: MarketplaceApp[];
  onInstall: () => void;
}

function AppCard({ app, installedOn, onInstall }: AppCardProps) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Package className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {categoryLabel(app.category)}
        </span>
      </div>

      <div className="mt-3 flex-1 space-y-1">
        <h3 className="font-semibold text-foreground">{app.display_name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{app.description}</p>
      </div>

      {installedOn.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Installed on:</p>
          <div className="flex flex-wrap gap-1">
            {installedOn.map((inst) => (
              <div key={inst.id} className="flex items-center gap-1">
                {inst.status === "running" ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                ) : inst.status === "failed" ? (
                  <XCircle className="h-3 w-3 text-destructive" />
                ) : (
                  <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
                )}
                {statusBadge(inst.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onInstall}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Download className="h-4 w-4" />
        Install
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [apps, setApps] = useState<AppCatalogEntry[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [installed, setInstalled] = useState<MarketplaceApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<AppCatalogEntry | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [appsRes, nodesRes] = await Promise.all([
        fetchWithAuth("/api/marketplace/apps"),
        fetchWithAuth("/api/nodes"),
      ]);

      if (!appsRes.ok) throw new Error("Failed to load marketplace");
      if (!nodesRes.ok) throw new Error("Failed to load nodes");

      const appsData: AppCatalogEntry[] = await appsRes.json();
      const nodesData: Node[] = await nodesRes.json();

      setApps(appsData);
      setNodes(nodesData);

      // Load installed apps for each node in parallel.
      const allInstalled: MarketplaceApp[] = [];
      await Promise.all(
        nodesData.map(async (node) => {
          try {
            const res = await fetchWithAuth(`/api/marketplace/node/${node.id}`);
            if (res.ok) {
              const data: MarketplaceApp[] = await res.json();
              allInstalled.push(...data);
            }
          } catch {
            // ignore per-node errors
          }
        })
      );
      setInstalled(allInstalled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleDeploySuccess() {
    setSelectedApp(null);
    setSuccessMsg("App deployment started! Check the job status for updates.");
    load();
    setTimeout(() => setSuccessMsg(null), 5000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Marketplace</h2>
          <p className="text-sm text-muted-foreground">Install self-hosted apps on your nodes</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Marketplace</h2>
        <p className="text-sm text-muted-foreground">Install self-hosted apps on your nodes</p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/10 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {apps.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">No apps available. Configure R2 on the server to enable the marketplace.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <AppCard
              key={app.name}
              app={app}
              installedOn={installed.filter((i) => i.app_name === app.name)}
              onInstall={() => setSelectedApp(app)}
            />
          ))}
        </div>
      )}

      {selectedApp && nodes.length > 0 && (
        <InstallModal
          app={selectedApp}
          nodes={nodes}
          onClose={() => setSelectedApp(null)}
          onSuccess={handleDeploySuccess}
        />
      )}
    </div>
  );
}
