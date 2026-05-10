"use client";

import { Loader2, CheckCircle2, Package } from "lucide-react";
import { useMarketplace } from "@/lib/features/marketplace/hooks/useMarketplace";
import { AppCard } from "@/components/features/marketplace/AppCard";
import { InstallModal } from "@/components/features/marketplace/InstallModal";

export default function MarketplacePage() {
  const {
    apps,
    nodes,
    installed,
    isLoading,
    error,
    selectedApp,
    setSelectedApp,
    successMsg,
    deploy,
    handleDeploySuccess,
  } = useMarketplace();

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
          onDeploy={deploy}
          onSuccess={handleDeploySuccess}
        />
      )}
    </div>
  );
}
