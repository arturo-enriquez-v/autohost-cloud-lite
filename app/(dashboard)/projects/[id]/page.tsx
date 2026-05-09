"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, UserMinus, UserPlus, FolderKanban, ArrowRightLeft, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useNodes } from "@/lib/hooks/useNodes"
import { useProjects } from "@/lib/features/projects/hooks/useProjects"
import { getTimeSinceLastSeen } from "@/lib/utils/node-status"
import type { Node } from "@/lib/types"

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { allNodes, isLoading: nodesLoading, refresh: refreshNodes } = useNodes()
  const { projects, isLoading: projectsLoading, assignNode, removeNode, updateProject, deleteProject } = useProjects()
  const [addNodeOpen, setAddNodeOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleRename = async () => {
    if (!nameInput.trim()) return
    setSubmitting(true)
    try {
      await updateProject(id, nameInput.trim())
      setRenameOpen(false)
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error al renombrar")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProject(id)
      router.push("/projects")
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error al eliminar")
    }
  }

  const project = projects.find((p) => p.id === id)

  const projectNodes = allNodes.filter((n) => n.projectId === id)
  const unassignedNodes = allNodes.filter((n) => !n.projectId)
  const otherProjectNodes = allNodes.filter((n) => n.projectId && n.projectId !== id)

  const handleAssign = async (nodeId: string) => {
    setActionError(null)
    try {
      await assignNode(id, nodeId)
      await refreshNodes()
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error al asignar nodo")
    }
  }

  const handleRemove = async (nodeId: string) => {
    setActionError(null)
    try {
      await removeNode(id, nodeId)
      await refreshNodes()
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error al quitar nodo")
    }
  }

  const isLoading = nodesLoading || projectsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to projects
        </Button>
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    )
  }

  const NodeRow = ({ node, inProject }: { node: Node; inProject: boolean }) => (
    <TableRow className="hover:bg-accent/50">
      <TableCell
        className="font-medium cursor-pointer"
        onClick={() => router.push(`/node/${node.id}`)}
      >
        {node.hostname || node.name}
      </TableCell>
      <TableCell className="font-mono text-sm">{node.ipLocal || "N/A"}</TableCell>
      <TableCell>{node.os || "N/A"}</TableCell>
      <TableCell>{getTimeSinceLastSeen(node.lastSeenAt)}</TableCell>
      <TableCell>
        <Badge
          variant={node.status === "online" ? "default" : "destructive"}
          className={node.status === "online" ? "bg-success text-black" : ""}
        >
          {node.status === "online" ? "🟢" : "🔴"} {node.status}
        </Badge>
      </TableCell>
      <TableCell>
        {inProject ? (
          <button
            title="Remove from project"
            onClick={() => handleRemove(node.id)}
            className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <UserMinus className="h-4 w-4" />
          </button>
        ) : (
          <button
            title="Add to project"
            onClick={() => handleAssign(node.id)}
            className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        )}
      </TableCell>
    </TableRow>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Projects
          </Button>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-2xl font-bold text-foreground">{project.name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            title="Rename project"
            onClick={() => { setNameInput(project.name); setActionError(null); setRenameOpen(true) }}
            className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            title="Delete project"
            onClick={() => setDeleteOpen(true)}
            className="rounded p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {actionError && (
        <p className="text-sm text-destructive">{actionError}</p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Nodes in this project{" "}
            <span className="text-muted-foreground font-normal">({projectNodes.length})</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddNodeOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add node
          </Button>
        </CardHeader>
        <CardContent>
          {projectNodes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No nodes assigned to this project yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectNodes.map((node) => (
                  <NodeRow key={node.id} node={node} inProject={true} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add node dialog */}
      <Dialog open={addNodeOpen} onOpenChange={setAddNodeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add nodes to &quot;{project.name}&quot;</DialogTitle>
          </DialogHeader>
          {unassignedNodes.length === 0 && otherProjectNodes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              All nodes are already in this project.
            </p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Unassigned nodes */}
              {unassignedNodes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Unassigned</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hostname</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unassignedNodes.map((node) => (
                        <NodeRow key={node.id} node={node} inProject={false} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Nodes in other projects (transfer) */}
              {otherProjectNodes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Transfer from other projects
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hostname</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Current project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otherProjectNodes.map((node) => {
                        const currentProject = projects.find((p) => p.id === node.projectId)
                        return (
                          <TableRow key={node.id} className="hover:bg-accent/50">
                            <TableCell className="font-medium">{node.hostname || node.name}</TableCell>
                            <TableCell className="font-mono text-sm">{node.ipLocal || "N/A"}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <FolderKanban className="h-3 w-3" />
                                {currentProject?.name ?? "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={node.status === "online" ? "default" : "destructive"}
                                className={node.status === "online" ? "bg-success text-black" : ""}
                              >
                                {node.status === "online" ? "🟢" : "🔴"} {node.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <button
                                title="Transfer to this project"
                                onClick={() => handleAssign(node.id)}
                                className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={(open) => { setRenameOpen(open); if (!open) setActionError(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Project name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button onClick={handleRename} disabled={submitting || !nameInput.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{project.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project. Nodes in this project will be unassigned but not deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete project
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
