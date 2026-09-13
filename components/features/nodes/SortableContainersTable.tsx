"use client"

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useEffect, useRef, useState } from "react"
import { GripVertical, Loader2, FileText, Play, Square, RotateCcw, Activity, Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import type { DockerContainer } from "@/lib/types"
import type { ContainerAction } from "@/lib/features/nodes/containers/hooks/useContainers"
import { useRouter } from "next/navigation"
import { fetchContainerSettings, saveContainerSettings } from "@/lib/features/nodes/api"
import { toast } from "sonner"

function applyStoredOrder(containers: DockerContainer[], stored: string[]): DockerContainer[] {
  if (!stored || stored.length === 0) return containers
  const byName = new Map(containers.map((c) => [c.name, c]))
  const byId = new Map(containers.map((c) => [c.id, c]))
  const ordered: DockerContainer[] = []
  for (const key of stored) {
    const found = byName.get(key) || byId.get(key)
    if (found) {
      ordered.push(found)
      byName.delete(found.name)
      byId.delete(found.id)
    }
  }
  return [...ordered, ...Array.from(byName.values())]
}

function ContainerStateBadge({ state }: { state: string }) {
  const cfg: Record<string, string> = {
    running: "bg-green-500/15 text-green-600 border-green-500/30",
    exited: "bg-muted text-muted-foreground",
    stopped: "bg-muted text-muted-foreground",
    paused: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    restarting: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  }
  return (
    <Badge variant="outline" className={cfg[state] ?? "bg-muted text-muted-foreground"}>
      {state}
    </Badge>
  )
}

interface SortableRowProps {
  ctr: DockerContainer
  actionState: { name: string; action: ContainerAction } | null
  isLocked: boolean
  onToggleLock: () => void
  onLog: () => void
  onMetricsAndBackups: () => void
  onRequestAction: (action: ContainerAction) => void
}

function SortableRow({
  ctr,
  actionState,
  isLocked,
  onToggleLock,
  onLog,
  onMetricsAndBackups,
  onRequestAction,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ctr.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const isActing = actionState?.name === ctr.name
  const anyActing = actionState !== null
  const isRunning = ctr.state === "running"
  const isExited = ctr.state === "exited" || ctr.state === "stopped"

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8 px-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-mono font-medium text-sm">
        <button
          onClick={onMetricsAndBackups}
          className="hover:underline hover:text-blue-400 text-left font-mono"
        >
          {ctr.name}
        </button>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <ContainerStateBadge state={ctr.state} />
          {ctr.status && (
            <span className="text-[10px] text-muted-foreground/60 font-mono">{ctr.status}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell text-xs font-mono text-muted-foreground">
        {ctr.cpu ?? "—"}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-xs font-mono text-muted-foreground">
        {ctr.mem ? (
          <span className="flex flex-col gap-0.5">
            <span>{ctr.mem}</span>
            {ctr.memPerc && (
              <span className="text-[10px] text-muted-foreground/60">{ctr.memPerc}</span>
            )}
          </span>
        ) : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {/* Botón unificado: Métricas y Respaldos */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            title="Métricas y Respaldos"
            onClick={onMetricsAndBackups}
          >
            <Activity className="h-4 w-4" />
          </Button>

          {/* Logs */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Logs"
            onClick={onLog}
          >
            <FileText className="h-4 w-4" />
          </Button>

          {/* Candado de protección contra acciones */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 transition-colors ${
              isLocked
                ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                : "text-muted-foreground/30 hover:text-muted-foreground hover:bg-secondary/50"
            }`}
            title={
              isLocked
                ? "Acciones bloqueadas por candado (clic para desbloquear)"
                : "Acciones desbloqueadas (clic para bloquear y proteger)"
            }
            onClick={onToggleLock}
          >
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>

          {/* Iniciar */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10 disabled:opacity-30"
            title={isLocked ? "Acción protegida por candado" : "Iniciar contenedor"}
            disabled={anyActing || isRunning || isLocked}
            onClick={() => onRequestAction("start")}
          >
            {isActing && actionState?.action === "start" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Apagar / Detener */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30"
            title={isLocked ? "Acción protegida por candado" : "Detener contenedor"}
            disabled={anyActing || isExited || isLocked}
            onClick={() => onRequestAction("stop")}
          >
            {isActing && actionState?.action === "stop" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>

          {/* Reiniciar */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-30"
            title={isLocked ? "Acción protegida por candado" : "Reiniciar contenedor"}
            disabled={anyActing || isLocked}
            onClick={() => onRequestAction("restart")}
          >
            {isActing && actionState?.action === "restart" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

interface Props {
  nodeId: string
  containers: DockerContainer[]
  actionState: { name: string; action: ContainerAction } | null
  onLog: (name: string) => void
  onAction: (name: string, action: ContainerAction) => Promise<void> | void
}

interface ConfirmModalState {
  open: boolean
  containerName: string
  action: ContainerAction | null
}

export function SortableContainersTable({ nodeId, containers, actionState, onLog, onAction }: Props) {
  const router = useRouter()
  const [sorted, setSorted] = useState<DockerContainer[]>([])
  const [locks, setLocks] = useState<Record<string, boolean>>({})
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    containerName: "",
    action: null,
  })

  const orderRef = useRef<string[]>([])
  const locksRef = useRef<Record<string, boolean>>({})

  // Load persisted settings from backend API
  useEffect(() => {
    let cancelled = false

    fetchContainerSettings(nodeId)
      .then((settings) => {
        if (cancelled) return
        const loadedOrder = settings?.sort_order ?? []
        const loadedLocks = settings?.locked_containers ?? {}
        orderRef.current = loadedOrder
        locksRef.current = loadedLocks
        setLocks(loadedLocks)
        setSorted((curr) => applyStoredOrder(containers.length > 0 ? containers : curr, loadedOrder))
      })
      .catch((err) => {
        console.error("Failed to load container settings:", err)
      })

    return () => {
      cancelled = true
    }
  }, [nodeId])

  // When live container list updates from gRPC streaming/polling, preserve user order
  useEffect(() => {
    setSorted(applyStoredOrder(containers, orderRef.current))
  }, [containers])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    let nextOrder: string[] = []
    setSorted((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id)
      const newIndex = prev.findIndex((c) => c.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      const next = arrayMove(prev, oldIndex, newIndex)
      nextOrder = next.map((c) => c.name)
      return next
    })

    if (nextOrder.length > 0) {
      orderRef.current = nextOrder
      try {
        await saveContainerSettings(nodeId, {
          sort_order: nextOrder,
          locked_containers: locksRef.current,
        })
      } catch (err) {
        console.error("Failed to save container order:", err)
        toast.error("No se pudo guardar el orden de los contenedores en el servidor")
      }
    }
  }

  const handleToggleLock = async (containerName: string) => {
    const currentLocked = Boolean(locksRef.current[containerName])
    const nextLocked = !currentLocked
    const nextLocks = { ...locksRef.current, [containerName]: nextLocked }

    // Optimistic update
    locksRef.current = nextLocks
    setLocks(nextLocks)

    try {
      await saveContainerSettings(nodeId, {
        sort_order: orderRef.current,
        locked_containers: nextLocks,
      })
      toast.success(
        nextLocked
          ? `Acciones bloqueadas para ${containerName}`
          : `Acciones desbloqueadas para ${containerName}`
      )
    } catch (err) {
      console.error("Failed to save container lock:", err)
      // Revert optimistic update
      const revertedLocks = { ...locksRef.current, [containerName]: currentLocked }
      locksRef.current = revertedLocks
      setLocks(revertedLocks)
      toast.error("No se pudo guardar la configuración de bloqueo")
    }
  }

  const handleRequestAction = (containerName: string, action: ContainerAction) => {
    if (locksRef.current[containerName]) {
      toast.error(`Acción bloqueada: el contenedor "${containerName}" está protegido por candado`)
      return
    }
    setConfirmModal({
      open: true,
      containerName,
      action,
    })
  }

  const handleConfirmAction = async () => {
    if (!confirmModal.action || !confirmModal.containerName) return
    const { containerName, action } = confirmModal
    setConfirmModal({ open: false, containerName: "", action: null })
    try {
      await onAction(containerName, action)
    } catch (err: any) {
      toast.error(err?.message || `Error al ejecutar acción en ${containerName}`)
    }
  }

  if (sorted.length === 0) return null

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 px-2" />
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">CPU</TableHead>
                  <TableHead className="hidden sm:table-cell">Memory</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((ctr) => (
                  <SortableRow
                    key={ctr.id}
                    ctr={ctr}
                    actionState={actionState}
                    isLocked={Boolean(locks[ctr.name] || locks[ctr.id])}
                    onToggleLock={() => handleToggleLock(ctr.name)}
                    onMetricsAndBackups={() =>
                      router.push(`/node/${nodeId}/containers/${encodeURIComponent(ctr.name)}`)
                    }
                    onLog={() => onLog(ctr.name)}
                    onRequestAction={(action) => handleRequestAction(ctr.name, action)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </SortableContext>
      </DndContext>

      {/* Confirmation Modal */}
      <AlertDialog
        open={confirmModal.open}
        onOpenChange={(open) => {
          if (!open) setConfirmModal({ open: false, containerName: "", action: null })
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-full ${
                  confirmModal.action === "stop"
                    ? "bg-rose-500/15 text-rose-500"
                    : confirmModal.action === "restart"
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-green-500/15 text-green-500"
                }`}
              >
                {confirmModal.action === "stop" && <Square className="h-5 w-5" />}
                {confirmModal.action === "restart" && <RotateCcw className="h-5 w-5" />}
                {confirmModal.action === "start" && <Play className="h-5 w-5" />}
              </div>
              <AlertDialogTitle>
                {confirmModal.action === "start" && "Confirmar inicio"}
                {confirmModal.action === "stop" && "Confirmar apagado"}
                {confirmModal.action === "restart" && "Confirmar reinicio"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2 text-sm text-foreground/80">
              {confirmModal.action === "start" && (
                <>
                  ¿Estás seguro de que deseas <strong>iniciar</strong> el contenedor{" "}
                  <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-foreground font-semibold">
                    {confirmModal.containerName}
                  </code>?
                </>
              )}
              {confirmModal.action === "stop" && (
                <>
                  ¿Estás seguro de que deseas <strong>apagar / detener</strong> el contenedor{" "}
                  <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-foreground font-semibold">
                    {confirmModal.containerName}
                  </code>? El servicio dejará de responder peticiones.
                </>
              )}
              {confirmModal.action === "restart" && (
                <>
                  ¿Estás seguro de que deseas <strong>reiniciar</strong> el contenedor{" "}
                  <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-foreground font-semibold">
                    {confirmModal.containerName}
                  </code>? Experimentará una breve interrupción de servicio.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmModal.action === "stop"
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : confirmModal.action === "restart"
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-green-600 text-white hover:bg-green-700"
              }
              onClick={handleConfirmAction}
            >
              {confirmModal.action === "start" && "Iniciar"}
              {confirmModal.action === "stop" && "Apagar"}
              {confirmModal.action === "restart" && "Reiniciar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

