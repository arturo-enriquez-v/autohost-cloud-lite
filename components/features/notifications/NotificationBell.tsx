"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  FileText,
  AlertCircle,
  Info,
  Server,
  ChevronRight,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/lib/context/notifications-context"
import { cn } from "@/lib/utils"

function formatTimeAgo(dateStr: string): string {
  try {
    const diff = Math.max(0, Date.now() - new Date(dateStr).getTime())
    const sec = Math.floor(diff / 1000)
    if (sec < 60) return "hace unos segundos"
    const min = Math.floor(sec / 60)
    if (min < 60) return `hace ${min}m`
    const hours = Math.floor(min / 60)
    if (hours < 24) return `hace ${hours}h`
    const days = Math.floor(hours / 24)
    return `hace ${days}d`
  } catch {
    return ""
  }
}

export function NotificationBell() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"all" | "alerts" | "logs">("all")

  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    unreadAlerts,
    unreadLogs,
    totalUnread,
    recentAlerts,
    recentLogs,
    markAlertsAsRead,
    markLogsAsRead,
    markAllAsRead,
  } = useNotifications()

  // Merge and sort recent items
  const items = useMemo(() => {
    const alerts = recentAlerts.map((a) => ({
      id: `alert-${a.id}`,
      originalId: a.id,
      kind: "alert" as const,
      title: a.message || `Alerta: ${a.alert_type}`,
      subtitle: a.node_name ? `Nodo: ${a.node_name}` : undefined,
      badgeText: a.alert_type.toUpperCase(),
      severity: a.alert_type === "offline" || a.alert_type === "disk" ? "critical" : "warning",
      date: a.created_at,
    }))

    const logs = recentLogs.map((l) => ({
      id: `log-${l.id}`,
      originalId: l.id,
      kind: "log" as const,
      title: l.title,
      subtitle: l.node_name ? `Nodo: ${l.node_name}` : l.message || undefined,
      badgeText: l.level.toUpperCase(),
      severity: l.level === "error" ? "critical" : l.level === "warn" ? "warning" : "info",
      date: l.created_at,
    }))

    const combined = [...alerts, ...logs]
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return combined
  }, [recentAlerts, recentLogs])

  const filteredItems = useMemo(() => {
    if (tab === "alerts") return items.filter((i) => i.kind === "alert")
    if (tab === "logs") return items.filter((i) => i.kind === "log")
    return items
  }, [items, tab])

  const handleItemClick = (kind: "alert" | "log") => {
    setOpen(false)
    if (kind === "alert") {
      markAlertsAsRead()
      router.push("/alerts")
    } else {
      markLogsAsRead()
      router.push("/logs")
    }
  }

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-0"
        title="Notificaciones"
        suppressHydrationWarning
      >
        <Bell className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-0"
          title="Notificaciones"
          suppressHydrationWarning
        >
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-card animate-in zoom-in-50">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">Notificaciones</span>
            {totalUnread > 0 && (
              <Badge variant="secondary" className="bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] py-0 px-1.5 font-medium">
                {totalUnread} nuevas
              </Badge>
            )}
          </div>
          {totalUnread > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Marcar todas como leídas"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Marcar leídas</span>
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-border bg-card px-3 pt-2 gap-1">
          <button
            onClick={() => setTab("all")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              tab === "all"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Todas
          </button>
          <button
            onClick={() => setTab("alerts")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              tab === "alerts"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Alertas
            {unreadAlerts > 0 && (
              <span className="h-4 min-w-[14px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] px-1 font-bold">
                {unreadAlerts}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("logs")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              tab === "logs"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Logs
            {unreadLogs > 0 && (
              <span className="h-4 min-w-[14px] flex items-center justify-center rounded-full bg-[#70AEFF] text-black text-[9px] px-1 font-bold">
                {unreadLogs}
              </span>
            )}
          </button>
        </div>

        {/* Content list */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No hay notificaciones recientes</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.kind)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-accent/40 transition-colors group"
              >
                <div className="mt-0.5 shrink-0">
                  {item.kind === "alert" ? (
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      item.severity === "critical"
                        ? "bg-rose-500/15 text-rose-500"
                        : "bg-amber-500/15 text-amber-500"
                    )}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      item.severity === "critical"
                        ? "bg-rose-500/15 text-rose-500"
                        : item.severity === "warning"
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-blue-500/15 text-blue-400"
                    )}>
                      {item.severity === "critical" ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded border",
                      item.kind === "alert"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-[#70AEFF]/10 text-[#70AEFF] border-[#70AEFF]/20"
                    )}>
                      {item.badgeText}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 ml-auto">
                      {formatTimeAgo(item.date)}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </p>

                  {item.subtitle && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-1" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/20 px-3 py-2 flex items-center justify-between text-xs">
          <button
            onClick={() => { setOpen(false); router.push("/alerts") }}
            className="text-muted-foreground hover:text-[#70AEFF] transition-colors font-medium"
          >
            Ver alertas →
          </button>
          <button
            onClick={() => { setOpen(false); router.push("/logs") }}
            className="text-muted-foreground hover:text-[#70AEFF] transition-colors font-medium"
          >
            Ver logs externos →
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
