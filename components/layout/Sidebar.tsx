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

interface SidebarProps {
  isCollapsed: boolean
  isMobileOpen: boolean
  onToggle: () => void
  onClose: () => void
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "nodes", label: "Nodes", icon: Server, path: "/nodes" },
  { id: "marketplace", label: "Marketplace", icon: Store, path: "/marketplace" },
  { id: "alerts", label: "Alerts", icon: AlertTriangle, path: "/alerts" },
  { id: "external-logs", label: "External Logs", icon: FileText, path: "/logs" },
  { id: "reports", label: "Reports", icon: Mail, path: "/reports" },
  { id: "schedules", label: "Schedules", icon: Calendar, path: "/schedules" },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
]

export function Sidebar({ isCollapsed, isMobileOpen, onToggle, onClose }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { projects, createProject } = useProjects()
  const { selectedProject, setSelectedProject } = useProjectContext()
  const [projectsOpen, setProjectsOpen] = useState(true)
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

  const renderNavItems = (collapsed: boolean) => (
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
                ? "bg-[#70AEFF]/20 text-[#70AEFF] font-semibold"
                : "text-sidebar-foreground hover:bg-[#70AEFF]/15 hover:text-[#70AEFF]",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        )
      })}
    </>
  )

  const renderContent = (collapsed: boolean) => (
    <>
      {/* Brand header */}
      <a
        href="https://cloud.autohst.dev/"
        className={cn(
          "flex items-center border-b border-border px-3 py-3 shrink-0 hover:opacity-85 transition-opacity cursor-pointer group",
          collapsed ? "justify-center" : "gap-2.5"
        )}
      >
        <AutohostLogo className="h-8 w-8 shrink-0 transition-transform group-hover:scale-105" />
        {!collapsed && (
          <span className="text-sm font-bold tracking-wide text-sidebar-foreground group-hover:text-[#70AEFF] transition-colors">
            AutoHost
          </span>
        )}
      </a>
      <nav className="flex-1 overflow-y-auto p-3">
        {collapsed ? (
          <div className="space-y-1">
            {renderProjectsCollapsed()}
            <div className="my-2 border-t border-border" />
            {renderNavItems(true)}
          </div>
        ) : (
          <div className="space-y-1">
            {renderProjectsSection()}
            <div className="my-2 border-t border-border" />
            {renderNavItems(false)}
          </div>
        )}
      </nav>
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
        {renderContent(isCollapsed)}
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
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <a href="https://cloud.autohst.dev/" className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer group">
            <AutohostLogo className="h-6 w-6 shrink-0 transition-transform group-hover:scale-105" />
            <span className="text-sm font-semibold text-sidebar-foreground group-hover:text-[#70AEFF] transition-colors">AutoHost</span>
          </a>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-sidebar-foreground hover:bg-[#70AEFF]/15 hover:text-[#70AEFF]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {renderContent(false)}
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
            {formError && <p className="text-sm text-destructive">{formError}</p>}
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
