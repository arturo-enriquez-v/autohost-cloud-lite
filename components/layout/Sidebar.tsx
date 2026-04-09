"use client"

import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Store,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"

interface SidebarProps {
  isCollapsed: boolean
  isMobileOpen: boolean
  onToggle: () => void
  onClose: () => void
}

export function Sidebar({ isCollapsed, isMobileOpen, onToggle, onClose }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { id: "nodes", label: "Nodes", icon: Server, path: "/nodes" },
    { id: "marketplace", label: "Marketplace", icon: Store, path: "/marketplace" },
    { id: "alerts", label: "Alerts", icon: AlertTriangle, path: "/alerts" },
    { id: "schedules", label: "Schedules", icon: Calendar, path: "/schedules" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ]

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname?.startsWith(path)
  }

  const navigate = (path: string) => {
    router.push(path)
    onClose()
  }

  const NavItems = ({ collapsed }: { collapsed: boolean }) => (
    <>
      {menuItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.path)
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              collapsed ? "justify-center gap-0" : "gap-3",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        )
      })}
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-sidebar transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <nav className="flex-1 space-y-1 p-3">
          <NavItems collapsed={isCollapsed} />
        </nav>
        <div className="border-t border-border p-3">
          <button
            onClick={onToggle}
            title={isCollapsed ? "Expand" : "Collapse"}
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors",
              isCollapsed ? "justify-center" : "gap-3",
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-sidebar transition-transform duration-300 lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <span className="text-sm font-semibold text-sidebar-foreground">Menu</span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <NavItems collapsed={false} />
        </nav>
      </aside>
    </>
  )
}
