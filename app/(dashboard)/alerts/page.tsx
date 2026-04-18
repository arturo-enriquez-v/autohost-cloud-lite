"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, Wifi, RefreshCw, ServerCrash } from "lucide-react"
import { useAlertEvents } from "@/lib/hooks"
import type { AlertEventType } from "@/lib/types"

const ALERT_LABELS: Record<AlertEventType, string> = {
  offline: "Offline",
  cpu: "High CPU",
  ram: "High RAM",
  disk: "Low Disk",
}

const ALERT_VARIANTS: Record<AlertEventType, "destructive" | "default" | "secondary"> = {
  offline: "destructive",
  cpu: "default",
  ram: "default",
  disk: "default",
}

function AlertIcon({ type }: { type: AlertEventType }) {
  if (type === "offline") {
    return (
      <div className="rounded-full bg-destructive/10 p-2">
        <ServerCrash className="h-5 w-5 text-destructive" />
      </div>
    )
  }
  if (type === "cpu" || type === "ram" || type === "disk") {
    return (
      <div className="rounded-full bg-warning/10 p-2">
        <AlertTriangle className="h-5 w-5 text-warning" />
      </div>
    )
  }
  return (
    <div className="rounded-full bg-primary/10 p-2">
      <AlertCircle className="h-5 w-5 text-primary" />
    </div>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? "s" : ""} ago`
}

// Strip HTML tags from the Telegram message for display.
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "")
}

export default function AlertsPage() {
  const { events, isLoading, error, refresh } = useAlertEvents(100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Alerts</h2>
          <p className="text-sm text-muted-foreground">Recent system alerts and notifications</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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

          {!isLoading && !error && events.length > 0 && (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="mt-0.5">
                    <AlertIcon type={event.alert_type} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground">
                        {ALERT_LABELS[event.alert_type] ?? event.alert_type}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={ALERT_VARIANTS[event.alert_type] ?? "secondary"}
                          className={
                            event.alert_type !== "offline"
                              ? "bg-warning text-black"
                              : undefined
                          }
                        >
                          {ALERT_LABELS[event.alert_type] ?? event.alert_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelative(event.created_at)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{stripHtml(event.message)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
