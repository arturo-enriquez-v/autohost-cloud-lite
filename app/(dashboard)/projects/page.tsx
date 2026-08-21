"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, FolderKanban, Pencil, Trash2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useProjects } from "@/lib/features/projects/hooks/useProjects"
import { useProjectContext } from "@/lib/context/project-context"
import type { Project } from "@/lib/types"

export default function ProjectsPage() {
  const router = useRouter()
  const { projects, isLoading, error, createProject, updateProject, deleteProject } = useProjects()
  const { setSelectedProject } = useProjectContext()

  const [createOpen, setCreateOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [nameInput, setNameInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleCreate = async () => {
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

  const handleUpdate = async () => {
    if (!editProject || !nameInput.trim()) return
    setSubmitting(true)
    setFormError(null)
    try {
      await updateProject(editProject.id, nameInput.trim())
      setEditProject(null)
      setNameInput("")
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error al actualizar proyecto")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProject(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // error handled by hook
    }
  }

  const openProject = (project: Project) => {
    setSelectedProject(project)
    router.push(`/projects/${project.id}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Projects</h2>
          <p className="text-sm text-muted-foreground">
            Organise your nodes into projects
          </p>
        </div>
        <Button onClick={() => { setNameInput(""); setCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No projects yet. Create one to start grouping nodes.</p>
            <Button variant="outline" onClick={() => { setNameInput(""); setCreateOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Create first project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openProject(project)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold truncate">
                  {project.name}
                </CardTitle>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    title="Edit"
                    onClick={() => {
                      setEditProject(project)
                      setNameInput(project.name)
                      setFormError(null)
                    }}
                    className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => setDeleteTarget(project)}
                    className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
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
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            {formError && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
                <span>{formError}</span>
                {formError.toLowerCase().includes("limit") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCreateOpen(false)
                      router.push("/billing/plans")
                    }}
                    className="h-6 px-2 text-[10px] border-amber-500/40 text-amber-300 hover:bg-amber-500/20 shrink-0 font-semibold"
                  >
                    Upgrade
                  </Button>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting || !nameInput.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editProject} onOpenChange={(open) => !open && setEditProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Project name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
              autoFocus
            />
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditProject(null)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={submitting || !nameInput.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the project. Nodes assigned to it will be unassigned but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
