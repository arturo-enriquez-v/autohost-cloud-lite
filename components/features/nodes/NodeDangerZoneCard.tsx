"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2, TriangleAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
// import { useNode } from "@/lib/features/nodes/nodes/hooks/useNodes"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"


interface NodeDangerZoneCardProps {
  nodeId: string
}

export function NodeDangerZoneCard({ nodeId }: NodeDangerZoneCardProps) {
  const router = useRouter()
  // const { node } = useNode(nodeId)
  const { deleteNode } = useNodes()

  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    try {
      setLoading(true); setError(null)
      await deleteNode(nodeId)
      router.push("/nodes")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el nodo")
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-cezznter gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 gap-4">
            <div>
              <p className="text-sm font-medium">Delete this node</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All node tokens will be revoked and all associated data will be permanently deleted.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => setShowDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete node
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) setError(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este nodo?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Estás a punto de eliminar permanentemente el nodo{" "}
                  <strong className="text-foreground">{node?.hostname || node?.name}</strong>.
                </p>
                <p>
                  Se revocarán todos los tokens y se eliminará toda la información asociada.{" "}
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
          <div className="flex gap-3 justify-end mt-2">
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando...</>
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
