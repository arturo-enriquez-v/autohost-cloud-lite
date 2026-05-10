"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Wifi, FolderKanban } from "lucide-react"
import { useAlertEvents } from "@/lib/hooks"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import { useProjectContext } from "@/lib/context/project-context"
import { AlertItem } from "@/components/features/alerts/AlertItem"

export default function AlertsPage() {
  const { events, isLoading, error, refresh } = useAlertEvents(100)
  const { nodes } = useNodes()
  const { selectedProject } = useProjectContext()

  const scopedNodeIds = new Set(nodes.map((n) => n.id))
  const visibleEvents = selectedProject
    ? events.filter((e) => scopedNodeIds.has(e.node_id))
    : events

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Alerts</h2>
          <p className="text-sm text-muted-foreground">Recent system alerts and notifications</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedProject && (
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-accent/40 px-3 py-1 text-xs text-muted-foreground">
              <FolderKanban className="h-3.5 w-3.5" />
              <span>{selectedProject.name}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading alerts…
            </div>
          )}

          {!isLoading && error && (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          )}

          {!isLoading && !error && events.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Wifi className="h-8 w-8" />
              <p className="text-sm">No alerts yet — all systems nominal.</p>
            </div>
          )}

          {!isLoading && !error && events.length > 0 && visibleEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Wifi className="h-8 w-8" />
              <p className="text-sm">No alerts for nodes in &quot;{selectedProject?.name}&quot;.</p>
            </div>
          )}

          {!isLoading && !error && visibleEvents.length > 0 && (
            <div className="space-y-3">
              {visibleEvents.map((event) => (
                <AlertItem key={event.id} event={event} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
