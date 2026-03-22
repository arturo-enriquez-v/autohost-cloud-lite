"use client"

import { LayoutDashboard, Server, AlertTriangle, Calendar, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { id: "nodes", label: "Nodes", icon: Server, path: "/nodes" },
    { id: "alerts", label: "Alerts", icon: AlertTriangle, path: "/alerts" },
    { id: "schedules", label: "Schedules", icon: Calendar, path: "/schedules" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ]

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname?.startsWith(path)
  }

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-sidebar">
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
