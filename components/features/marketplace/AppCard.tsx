"use client";

import { Package, Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { AppCatalogEntry, MarketplaceApp } from "@/lib/types";
import { cn } from "@/lib/utils";

export function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    productivity: "Productivity",
    database: "Database",
    storage: "Storage",
  };
  return map[cat] ?? cat;
}

export function statusBadge(status: MarketplaceApp["status"]) {
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

interface AppCardProps {
  app: AppCatalogEntry;
  installedOn: MarketplaceApp[];
  onInstall: () => void;
}

export function AppCard({ app, installedOn, onInstall }: AppCardProps) {
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
