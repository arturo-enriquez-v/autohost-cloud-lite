"use client"

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CaddyStatusState } from "../hooks"

interface CaddyStatusBannerProps {
  status: CaddyStatusState
  onRetry: () => void
}

export function CaddyStatusBanner({ status, onRetry }: CaddyStatusBannerProps) {
  if (status === "idle") return null

  if (status === "checking") {
    return (
      <div className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Checking Caddy status on this node…
      </div>
    )
  }

  if (status === "running") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Caddy is running on this node. You can manage routes below.
      </div>
    )
  }

  if (status === "stopped") {
    return (
      <div className="flex items-center justify-between gap-4 flex-wrap rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <div className="flex items-center gap-3">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>
            Caddy is <strong>not running</strong> on this node. Install and start Caddy with admin API enabled
            (<code className="font-mono text-xs">admin localhost:2019</code> in Caddyfile) before adding routes.
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-2 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
          Check again
        </Button>
      </div>
    )
  }

  // unknown
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Could not determine Caddy status. The node may be offline or the agent is not responding.</span>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry} className="gap-2 shrink-0">
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  )
}
