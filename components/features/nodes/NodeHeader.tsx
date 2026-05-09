"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Wifi, WifiOff, Server, Network, Activity, Settings, ScrollText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"

interface NodeHeaderProps {
  nodeId: string
}

export function NodeHeader({ nodeId }: NodeHeaderProps) {
  const router = useRouter()
  const { node, isLoading } = useNodes(nodeId)

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" onClick={() => router.back()}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-2xl font-bold text-foreground truncate">
            {isLoading ? (
              <span className="text-muted-foreground">Loading…</span>
            ) : node?.name ? (
              node.name
            ) : (
              "Node Detail"
            )}
          </h2>
          {!isLoading && node && (
            <Badge
              variant="outline"
              className={
                node.status === "online"
                  ? "bg-green-500/15 text-green-600 border-green-500/30 shrink-0"
                  : "bg-muted text-muted-foreground shrink-0"
              }
            >
              {node.status === "online" ? (
                <Wifi className="h-3 w-3 mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              {node.status}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
            <Server className="h-3 w-3" />
            {nodeId}
          </span>
          {!isLoading && node?.ipLocal && (
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <Network className="h-3 w-3" />
              {node.ipLocal}
            </span>
          )}
          {!isLoading && node?.os && (
            <span className="text-xs text-muted-foreground">
              {node.os}{node.arch && ` · ${node.arch}`}
            </span>
          )}
          {!isLoading && node?.versionAgent && (
            <span className="text-xs text-muted-foreground">
              agent {node.versionAgent}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={() => router.push(`/node/${nodeId}/monitoring`)} className="gap-2">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">Monitoring</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`/node/${nodeId}/proxy`)} className="gap-2">
          <Network className="h-4 w-4" />
          <span className="hidden sm:inline">Proxy</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`/node/${nodeId}/config`)} className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Config</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`/node/${nodeId}/logs`)} className="gap-2">
          <ScrollText className="h-4 w-4" />
          <span className="hidden sm:inline">Live Logs</span>
        </Button>
      </div>
    </div>
  )
}
