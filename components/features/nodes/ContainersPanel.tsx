"use client"

import { useRouter } from "next/navigation"
import { Box, RefreshCw, Activity, AlertTriangle, Terminal, Wifi, WifiOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SortableContainersTable } from "@/components/features/nodes/SortableContainersTable"
import { useContainersLive } from "@/lib/features/nodes/containers/hooks/useContainersLive"

interface ContainersPanelProps {
  nodeId: string
}

export function ContainersPanel({ nodeId }: ContainersPanelProps) {
  const router = useRouter()
  const {
    containers,
    connected,
    streamError,
    dockerUnavailable,
    actionState,
    reconnect,
    runAction,
  } = useContainersLive(nodeId)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Box className="h-5 w-5 shrink-0" />
            Containers
            {containers.length > 0 && (
              <Badge variant="outline" className="text-xs">{containers.length}</Badge>
            )}
            <Badge
              variant="outline"
              className={`text-xs gap-1 ${connected
                ? "bg-green-500/10 text-green-600 border-green-500/30"
                : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {connected ? (
                <><Activity className="h-3 w-3" />Live</>
              ) : (
                <><WifiOff className="h-3 w-3" />Offline</>
              )}
            </Badge>
          </CardTitle>
          <CardDescription className="mt-1 text-xs sm:text-sm">
            {connected
              ? "Real-time · updates via gRPC"
              : streamError ?? "Connecting…"}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={reconnect}
          disabled={connected || actionState !== null}
          className="shrink-0 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Reconnect</span>
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
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
              <p className="text-xs text-muted-foreground">Then click <strong>Reconnect</strong> to verify.</p>
            </div>
          </div>
        ) : !connected && containers.length === 0 ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
            <Wifi className="h-5 w-5" />
            {streamError ?? "Connecting to node…"}
          </div>
        ) : containers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No containers found on this node.
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
