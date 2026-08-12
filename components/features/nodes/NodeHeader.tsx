"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Wifi, WifiOff, Server, Network, Shield, Activity, Settings, ScrollText } from "lucide-react"
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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 mt-0.5 sm:mt-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">
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

          <div className="flex items-center gap-3 sm:gap-4 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <Server className="h-3 w-3" />
              {nodeId}
            </span>
            {!isLoading && node?.ipLocal && (
              <span className="text-xs text-muted-foreground font-mono flex items-center gap-1" title="IP Local / Pública">
                <Network className="h-3 w-3" />
                {node.ipLocal}
              </span>
            )}
            {!isLoading && node?.ipVpn && (
              <span className="text-xs font-mono flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20" title="IP Privada VPN (Headscale)">
                <Shield className="h-3 w-3" />
                {node.ipVpn}
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
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-start md:justify-end">
        <Button variant="outline" size="sm" onClick={() => router.push(`/node/${nodeId}/monitoring`)} className="gap-1.5 flex-1 sm:flex-initial">
          <Activity className="h-4 w-4" />
          <span>Monitoring</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`/node/${nodeId}/proxy`)} className="gap-1.5 flex-1 sm:flex-initial">
          <Network className="h-4 w-4" />
          <span>Proxy</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`/node/${nodeId}/config`)} className="gap-1.5 flex-1 sm:flex-initial">
          <Settings className="h-4 w-4" />
          <span>Config</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`/node/${nodeId}/logs`)} className="gap-1.5 flex-1 sm:flex-initial">
          <ScrollText className="h-4 w-4" />
          <span>Live Logs</span>
        </Button>
      </div>
    </div>
  )
}
