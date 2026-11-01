"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Cpu, HardDrive, MemoryStick, Clock, Thermometer } from "lucide-react"
import { useRouter } from "next/navigation"
import { getTimeSinceLastSeen } from "@/lib/utils/node-status"

interface Container {
  name: string
  status: "running" | "stopped"
}

interface Server {
  id: string
  name: string
  status: "online" | "offline"
  cpu: number
  ram: number
  disk: number
  cpuTempCelsius?: number
  isLocal?: boolean
  containers: Container[]
  lastSeenAt?: string
}

interface ServerCardProps {
  server: Server
}

export function ServerCard({ server }: ServerCardProps) {
  const router = useRouter()

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5"
      onClick={() => router.push(`/node/${server.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">{server.name}</CardTitle>
            {server.isLocal && (
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary shrink-0">
                Local / Master
              </Badge>
            )}
          </div>
          <Badge
            variant={server.status === "online" ? "default" : "destructive"}
            className={server.status === "online" ? "bg-success text-black shrink-0" : "shrink-0"}
          >
            <span className="mr-1.5">{server.status === "online" ? "🟢" : "🔴"}</span>
            {server.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Cpu className="h-4 w-4" />
                <span>CPU</span>
                {server.cpuTempCelsius && server.cpuTempCelsius > 0 ? (
                  <span className="flex items-center gap-0.5 text-xs text-amber-500">
                    <Thermometer className="h-3 w-3" />
                    {server.cpuTempCelsius.toFixed(1)}°C
                  </span>
                ) : null}
              </div>
              <span className="font-medium text-foreground">{server.cpu}%</span>
            </div>
            <Progress value={server.cpu} className="h-2" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MemoryStick className="h-4 w-4" />
                <span>RAM</span>
              </div>
              <span className="font-medium text-foreground">{server.ram}%</span>
            </div>
            <Progress value={server.ram} className="h-2" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HardDrive className="h-4 w-4" />
                <span>Disk</span>
              </div>
              <span className="font-medium text-foreground">{server.disk}%</span>
            </div>
            <Progress value={server.disk} className="h-2" />
          </div>

          <div className="border-t border-border pt-2 mt-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last Seen</span>
              </div>
              <span className="text-xs font-medium text-foreground">
                {getTimeSinceLastSeen(server.lastSeenAt)}
              </span>
            </div>
          </div>
        </div>

        {server.containers.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">CONTAINERS</p>
            <div className="space-y-1.5">
              {server.containers.map((container) => (
                <div
                  key={container.name}
                  className="flex items-center justify-between rounded-md bg-secondary/50 px-2.5 py-1.5 text-xs"
                >
                  <span className="font-medium text-foreground">{container.name}</span>
                  <Badge variant="outline" className="h-5 border-success/50 text-success">
                    {container.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {server.status === "offline" && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
            Node is currently offline
          </div>
        )}
      </CardContent>
    </Card>
  )
}
