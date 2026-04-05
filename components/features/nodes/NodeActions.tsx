"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react"
import type { Node } from "@/lib/types"

interface NodeActionsProps {
  node: Node
  onUpdate: (nodeId: string, hostname: string) => Promise<void>
  onDelete: (nodeId: string) => Promise<void>
  isUpdating?: boolean
}

export function NodeActions({ node, onUpdate, onDelete, isUpdating }: NodeActionsProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editHostname, setEditHostname] = useState(node.hostname || node.name || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEdit = async () => {
    if (!editHostname.trim()) {
      setError("El nombre del nodo no puede estar vacío")
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      await onUpdate(node.id, editHostname.trim())
      setShowEditDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el nodo")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await onDelete(node.id)
      setShowDeleteDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el nodo")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Editar</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Eliminar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open: boolean) => { setShowEditDialog(open); if (!open) setError(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nombre del nodo</DialogTitle>
            <DialogDescription>
              Cambia el nombre de identificación del nodo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && (
              <div className="text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2">
                {error}
              </div>
            )}
            <Input
              placeholder="Nombre del nodo"
              value={editHostname}
              onChange={(e) => setEditHostname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              disabled={isLoading || isUpdating}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isLoading || isUpdating}
            >
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isLoading || isUpdating}>
              {isLoading || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open: boolean) => { setShowDeleteDialog(open); if (!open) setError(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar nodo?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Estás a punto de eliminar permanentemente el nodo{" "}
                  <strong className="text-foreground">{node.hostname || node.name}</strong>.
                </p>
                <p>
                  Se revocarán todos los tokens del nodo y se eliminará toda la información asociada.{" "}
                  Esta acción no se puede deshacer.
                </p>
                {error && (
                  <div className="text-destructive rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2">
                    {error}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <AlertDialogCancel disabled={isLoading || isUpdating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading || isUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar nodo"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
