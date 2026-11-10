"use client"

import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  Calendar,
  Settings,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Store,
  FolderKanban,
  Plus,
  Layers,
  Loader2,
  FileText,
  Network,
  Share2,
  CreditCard,
  Activity,
  Zap,
  Receipt,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import { useProjects } from "@/lib/features/projects/hooks/useProjects"
import { useProjectContext } from "@/lib/context/project-context"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AutohostLogo } from "@/components/ui/AutohostLogo"
import { useNotifications } from "@/lib/context/notifications-context"

interface SidebarProps {
  isCollapsed: boolean
  isMobileOpen: boolean
  onToggle: () => void
  onClose: () => void
}

const coreMenuItemsTop = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "nodes", label: "Nodes", icon: Server, path: "/nodes" },
  { id: "files", label: "Files", icon: FolderOpen, path: "/files" },
  { id: "clusters", label: "Clusters", icon: Layers, path: "/clusters" },
]

const coreMenuItemsBottom = [
  { id: "marketplace", label: "Marketplace", icon: Store, path: "/marketplace" },
]

const operationsMenuItems = [
  { id: "alerts", label: "Alerts", icon: AlertTriangle, path: "/alerts" },
  { id: "external-logs", label: "External Logs", icon: FileText, path: "/logs" },
  { id: "reports", label: "Reports", icon: Mail, path: "/reports" },
  { id: "schedules", label: "Schedules", icon: Calendar, path: "/schedules" },
]

const adminMenuItems = [
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
]

const IS_COMMUNITY = process.env.NEXT_PUBLIC_EDITION === "community"

export function Sidebar({ isCollapsed, isMobileOpen, onToggle, onClose }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { projects, createProject } = useProjects()
  const { selectedProject, setSelectedProject } = useProjectContext()
  const { unreadAlerts, unreadLogs } = useNotifications()
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [networkingOpen, setNetworkingOpen] = useState(false)
  const [billingOpen, setBillingOpen] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname?.startsWith(path)
  }

  const navigate = (path: string) => {
    router.push(path)
    onClose()
  }

  const handleCreateProject = async () => {
    if (!nameInput.trim()) return
    setSubmitting(true)
    setFormError(null)
    try {
      await createProject(nameInput.trim())
      setCreateOpen(false)
      setNameInput("")
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error al crear proyecto")
    } finally {
      setSubmitting(false)
    }
  }

  const renderProjectsSection = () => (
    <div className="mb-1">
      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          onClick={() => navigate("/projects")}
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wider transition-colors",
            pathname?.startsWith("/projects")
              ? "text-[#70AEFF]"
              : "text-sidebar-foreground/50 hover:text-[#70AEFF]"
          )}
        >
          Projects
        </button>
        <button
          onClick={() => setProjectsOpen((o) => !o)}
          className="rounded p-0.5 text-sidebar-foreground/40 hover:text-[#70AEFF] hover:bg-[#70AEFF]/15 transition-colors"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform duration-200", projectsOpen && "rotate-180")}
          />
        </button>
      </div>

      {projectsOpen && (
        <div className="mt-0.5 space-y-0.5">
          <button
            onClick={() => setSelectedProject(null)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              !selectedProject
                ? "bg-[#70AEFF]/20 text-[#70AEFF] font-semibold"
                : "text-sidebar-foreground hover:bg-[#70AEFF]/15 hover:text-[#70AEFF]"
            )}
          >
            <Layers className="h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">All nodes</span>
          </button>

          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                selectedProject?.id === p.id
                  ? "bg-[#70AEFF]/20 text-[#70AEFF] font-semibold"
                  : "text-sidebar-foreground hover:bg-[#70AEFF]/15 hover:text-[#70AEFF]"
              )}
            >
              <FolderKanban className="h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate">{p.name}</span>
            </button>
          ))}

          <button
            onClick={() => { setNameInput(""); setFormError(null); setCreateOpen(true) }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/60 hover:bg-[#70AEFF]/15 hover:text-[#70AEFF] transition-colors"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>New Project</span>
          </button>
        </div>
      )}
    </div>
  )

  const renderProjectsCollapsed = () => (
    <button
      title="Projects"
      onClick={() => navigate("/projects")}
      className={cn(
        "flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        pathname?.startsWith("/projects")
          ? "bg-[#70AEFF]/20 text-[#70AEFF]"
          : "text-sidebar-foreground hover:bg-[#70AEFF]/15 hover:text-[#70AEFF]"
      )}
    >
      <FolderKanban className="h-5 w-5" />
    </button>
  )

  const renderNetworkingSection = (collapsed: boolean) => {
    if (collapsed) {
      return (
        <button
          title="Topology"
          onClick={() => navigate("/networking/topology")}
          className={cn(
            "flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname?.startsWith("/networking")
              ? "bg-[#70AEFF]/20 text-[#70AEFF]"
              : "text-sidebar-foreground hover:bg-[#70AEFF]/15 hover:text-[#70AEFF]"
          )}
        >
          <Network className="h-5 w-5" />
        </button>
      )
    }
    return (
      <div className="mb-1">
        <button
          onClick={() => setNetworkingOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname?.startsWith("/networking")
              ? "bg-[#70AEFF]/20 text-[#70AEFF] font-semibold"
              : "text-sidebar-foreground hover:bg-[#70AEFF]/15 hover:text-[#70AEFF]"
          )}
        >
          <Network className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">Networking</span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform duration-200", networkingOpen && "rotate-180")}
          />
        </button>
        {networkingOpen && (
          <div className="mt-0.5 space-y-0.5 pl-4">
            <button
              onClick={() => navigate("/networking/topology")}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/networking/topology"
                  ? "bg-[#70AEFF]/20 text-[#70AEFF] font-semibold"
                  : "text-sidebar-foreground/80 hover:bg-[#70AEFF]/15 hover:text-[#70AEFF]"
              )}
            >
              <Share2 className="h-4 w-4 shrink-0 opacity-70" />
              <span>Topology</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderBillingSection = (collapsed: boolean) => {
    const active = pathname?.startsWith("/billing")
    if (collapsed) {
      return (
        <button
          title="Usage"
          onClick={() => navigate("/billing")}
          className={cn(
            "flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            active
              ? "bg-[#70AEFF]/20 text-[#70AEFF]"
              : "text-sidebar-foreground hover:bg-[#70AEFF]/15 hover:text-[#70AEFF]"
          )}
        >
          <Activity className="h-5 w-5" />
        </button>
      )
    }
    return (
      <div className="mb-1">
        <button
          onClick={() => navigate("/billing")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            active
              ? "bg-[#70AEFF]/20 text-[#70AEFF] font-semibold"
              : "text-sidebar-foreground hover:bg-[#70AEFF]/15 hover:text-[#70AEFF]"
          )}
        >
          <Activity className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">Usage</span>
        </button>
      </div>
    )
  }

  const renderNavItemList = (
    items: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }>; path: string }>,
    collapsed: boolean
  ) => (
    <>
      {items.map((item) => {
        const Icon = item.icon
        const active = isActive(item.path)
        const count =
          item.id === "alerts"
            ? unreadAlerts
            : item.id === "external-logs"
            ? unreadLogs
            : 0

        const badgeStyle =
          item.id === "alerts"
            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
            : "bg-[#70AEFF]/20 text-[#70AEFF] border border-[#70AEFF]/30"

        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            title={collapsed ? (count > 0 ? `${item.label} (${count})` : item.label) : undefined}
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              collapsed ? "justify-center gap-0" : "gap-3",
              active
                ? "bg-[#70AEFF]/20 text-[#70AEFF] font-semibold"
                : "text-sidebar-foreground hover:bg-[#70AEFF]/15 hover:text-[#70AEFF]",
            )}
          >
            <div className="relative shrink-0 flex items-center justify-center">
              <Icon className="h-5 w-5" />
              {collapsed && count > 0 && (
                <span
                  className={cn(
                    "absolute -top-1.5 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full text-[9px] font-bold shadow-sm ring-1 ring-sidebar px-0.5",
                    item.id === "alerts"
                      ? "bg-rose-500 text-white"
                      : "bg-[#70AEFF] text-black"
                  )}
                >
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </div>
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all animate-in fade-in-50",
                      badgeStyle
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </>
            )}
          </button>
        )
      })}
    </>
  )

  const renderNav = (collapsed: boolean) => (
    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
      {collapsed ? (
        <>
          {renderProjectsCollapsed()}
          <div className="my-2 border-t border-border" />
          {renderNavItemList(coreMenuItemsTop, true)}
          {renderNetworkingSection(true)}
          {renderNavItemList(coreMenuItemsBottom, true)}
          <div className="my-2 border-t border-border" />
          {renderNavItemList(operationsMenuItems, true)}
          <div className="my-2 border-t border-border" />
          {renderBillingSection(true)}
          {renderNavItemList(adminMenuItems, true)}
        </>
      ) : (
        <>
          {renderProjectsSection()}
          <div className="my-2 border-t border-border" />
          {renderNavItemList(coreMenuItemsTop, false)}
          {renderNetworkingSection(false)}
          {renderNavItemList(coreMenuItemsBottom, false)}
          <div className="my-2 border-t border-border" />
          {renderNavItemList(operationsMenuItems, false)}
          <div className="my-2 border-t border-border" />
          {renderBillingSection(false)}
          {renderNavItemList(adminMenuItems, false)}
        </>
      )}
    </nav>
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
        <a
          href="https://cloud.autohst.dev/"
          className={cn(
            "flex items-center border-b border-border px-3 py-3 shrink-0 hover:opacity-85 transition-opacity cursor-pointer group",
            isCollapsed ? "justify-center" : "gap-2.5"
          )}
        >
          <AutohostLogo className="h-7 w-auto shrink-0 transition-transform group-hover:scale-105" />
          {!isCollapsed && (
            <span className="text-sm font-bold tracking-wide text-sidebar-foreground group-hover:text-[#70AEFF] transition-colors">
              AutoHost
            </span>
          )}
        </a>
        {renderNav(isCollapsed)}
        <div className="border-t border-border p-3">
          <button
            onClick={onToggle}
            title={isCollapsed ? "Expand" : "Collapse"}
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-[#70AEFF]/15 hover:text-[#70AEFF] transition-colors",
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
        <div className="flex items-center justify-between border-b border-border px-3 py-3 shrink-0">
          <a href="https://cloud.autohst.dev/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer group">
            <AutohostLogo className="h-7 w-auto shrink-0 transition-transform group-hover:scale-105" />
            <span className="text-sm font-bold tracking-wide text-sidebar-foreground group-hover:text-[#70AEFF] transition-colors">
              AutoHost
            </span>
          </a>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-[#70AEFF]/15 hover:text-[#70AEFF] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {renderNav(false)}
      </aside>

      {/* Create project dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Project name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
              autoFocus
            />
            {formError && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
                <span>{formError}</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProject} disabled={submitting || !nameInput.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
