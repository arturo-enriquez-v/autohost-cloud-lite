"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Box, RefreshCw, Loader2, Activity, AlertTriangle, Terminal } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useContainers } from "../hooks"
import { SortableContainersTable } from "@/components/features/nodes/SortableContainersTable"

interface ContainersPanelProps {
  nodeId: string
}

export function ContainersPanel({ nodeId }: ContainersPanelProps) {
  const router = useRouter()
  const {
    containers,
    isRefreshing,
    lastRefreshed,
    refreshError,
    dockerUnavailable,
    actionState,
    refresh,
    runAction,
  } = useContainers(nodeId)

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 shrink-0" />
            Containers
            {containers.length > 0 && (
              <Badge variant="outline" className="text-xs">{containers.length}</Badge>
            )}
            <Badge variant="outline" className="text-xs gap-1 bg-green-500/10 text-green-600 border-green-500/30">
              <Activity className="h-3 w-3" />
              Live
            </Badge>
          </CardTitle>
          {lastRefreshed && !dockerUnavailable && (
            <CardDescription className="mt-1">
              Updated {lastRefreshed.toLocaleTimeString()} · auto-refresh 10s
            </CardDescription>
          )}
          {dockerUnavailable && (
            <CardDescription className="mt-1 text-warning">
              Auto-refresh paused — manual refresh only
            </CardDescription>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing || actionState !== null}
          className="shrink-0 gap-2"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isRefreshing ? "Loading…" : "Refresh"}
          </span>
        </Button>
      </CardHeader>

      <CardContent>
        {dockerUnavailable ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Docker is not accessible on this node.</p>
                <p className="text-sm text-muted-foreground">
                  Either Docker is not installed, or the{" "}
                  <code className="font-mono bg-muted px-1 rounded text-xs">autohost</code> user is not in the{" "}
                  <code className="font-mono bg-muted px-1 rounded text-xs">docker</code> group.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5" />
                Run on the node to fix:
              </p>
              <pre className="text-xs font-mono select-all">{`sudo usermod -aG docker autohost\nnewgrp docker`}</pre>
              <p className="text-xs text-muted-foreground">Then click <strong>Refresh</strong> to verify.</p>
            </div>
          </div>
        ) : refreshError ? (
          <p className="text-sm text-destructive py-2">{refreshError}</p>
        ) : isRefreshing && containers.length === 0 ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Fetching containers from node…
          </div>
        ) : containers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No containers found. Click <strong>Refresh</strong> to reload.
          </p>
        ) : (
          <SortableContainersTable
            nodeId={nodeId}
            containers={containers}
            actionState={actionState}
            onLog={(name) => router.push(`/node/${nodeId}/logs?container=${encodeURIComponent(name)}`)}
            onAction={runAction}
          />
        )}
      </CardContent>
    </Card>
  )
}
