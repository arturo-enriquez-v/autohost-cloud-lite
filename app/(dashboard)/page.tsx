"use client"

import { ServerCard } from "@/components/features/nodes"
import { useProjectContext } from "@/lib/context/project-context"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes";
import { FolderKanban } from "lucide-react"

export default function DashboardPage() {
  const { nodes, isLoading, isUpdating, error } = useNodes();
  const { selectedProject } = useProjectContext();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Monitor your infrastructure</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Loading servers...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Monitor your infrastructure</p>
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Monitor your infrastructure</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedProject && (
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-accent/40 px-3 py-1 text-xs text-muted-foreground">
              <FolderKanban className="h-3.5 w-3.5" />
              <span>{selectedProject.name}</span>
            </div>
          )}
          {isUpdating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span>Updating...</span>
            </div>
          )}
        </div>
      </div>

      {nodes.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {selectedProject
              ? `No nodes in project "${selectedProject.name}". Assign nodes from the Projects page.`
              : "No servers found. Add your first server to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {nodes.map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      )}
    </div>
  )
}
