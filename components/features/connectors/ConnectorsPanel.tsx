// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useMemo, useState } from "react"
import { Loader2, Plug, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConnectors } from "@/lib/features/connectors/hooks/useConnectors"
import { useProjects } from "@/lib/features/projects/hooks/useProjects"
import type { Connector, ConnectorInput } from "@/lib/features/connectors/interfaces/connector"
import { ConnectorCard } from "./ConnectorCard"
import { ConnectorEditorDialog } from "./ConnectorEditorDialog"

interface ConnectorsPanelProps {
  /** Only this project's connectors, and new ones go to it. */
  projectId?: string
  /** Compact header for embedding in another page. */
  embedded?: boolean
}

/**
 * Connectors as a grid of widgets and action buttons. Who can create or edit is decided by the API
 * (connectors:manage on the project); the "New" button is always shown and the API's answer explains a
 * refusal.
 */
export function ConnectorsPanel({ projectId, embedded = false }: ConnectorsPanelProps) {
  const { connectors, isLoading, error, create, update, remove } = useConnectors(projectId)
  const { projects } = useProjects()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Connector | null>(null)
  const [deleting, setDeleting] = useState<Connector | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const projectName = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])
  const sorted = useMemo(
    () =>
      [...connectors].sort(
        (a, b) =>
          (projectName.get(a.project_id) ?? "").localeCompare(projectName.get(b.project_id) ?? "") ||
          a.kind.localeCompare(b.kind) ||
          a.name.localeCompare(b.name)
      ),
    [connectors, projectName]
  )

  const openNew = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  const save = async (input: ConnectorInput, id?: string) => {
    if (id) await update(id, input)
    else await create(input)
    toast.success(id ? "Connector saved" : "Connector created")
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await remove(deleting.id)
      toast.success("Connector deleted")
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete connector")
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {embedded ? (
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Plug className="h-5 w-5 text-muted-foreground" />
            Connectors <span className="font-normal text-muted-foreground">({connectors.length})</span>
          </h3>
        ) : (
          <PageHeader
            className="w-full"
            icon={Plug}
            title="Connectors"
            description="Requests to external APIs, shared with your projects: widgets that show data and buttons that trigger actions."
            actions={
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                New connector
              </Button>
            }
          />
        )}
        {embedded && (
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            New connector
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <Plug className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No connectors yet. Create one to show data from an API or to trigger actions from here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((c) => (
            <ConnectorCard
              key={c.id}
              connector={c}
              projectName={projectId ? undefined : projectName.get(c.project_id)}
              onEdit={(conn) => {
                setEditing(conn)
                setEditorOpen(true)
              }}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <ConnectorEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        connector={editing}
        projects={projects}
        projectId={projectId}
        onSave={save}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="The connector, its stored credentials and its run history are deleted. This cannot be undone."
        confirmLabel="Delete"
        loading={deleteBusy}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
