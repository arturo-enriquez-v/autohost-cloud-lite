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
import { GripVertical, Loader2, FileText, Play, Square, RotateCcw, Activity, Lock, Unlock, Trash2 } from "lucide-react"
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
import { useNodePermissions } from "@/lib/features/users/hooks/usePermissions"
import { PERMS } from "@/lib/features/users/permissions"
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
  canAction: boolean
  canSettings: boolean
  canLogs: boolean
  onToggleLock: () => void
  onLog: () => void
  onMetricsAndBackups: () => void
  onRequestAction: (action: ContainerAction) => void
}

function SortableRow({
  ctr,
  actionState,
  isLocked,
  canAction,
  canSettings,
  canLogs,
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
          {/* Unified button: Metrics & Backups */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            title="Metrics & Backups"
            onClick={onMetricsAndBackups}
          >
            <Activity className="h-4 w-4" />
          </Button>

          {/* Logs */}
          {canLogs && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Logs"
              onClick={onLog}
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}

          {/* Action protection lock */}
          {canSettings && (
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
                  ? "Actions locked (click to unlock)"
                  : "Actions unlocked (click to lock & protect)"
              }
              onClick={onToggleLock}
            >
              {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
          )}

          {canAction && (
            <>
              {/* Start */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10 disabled:opacity-30"
                title={isLocked ? "Action protected by lock" : "Start container"}
                disabled={anyActing || isRunning || isLocked}
                onClick={() => onRequestAction("start")}
              >
                {isActing && actionState?.action === "start" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              {/* Stop */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30"
                title={isLocked ? "Action protected by lock" : "Stop container"}
                disabled={anyActing || isExited || isLocked}
                onClick={() => onRequestAction("stop")}
              >
                {isActing && actionState?.action === "stop" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>

              {/* Restart */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-30"
                title={isLocked ? "Action protected by lock" : "Restart container"}
                disabled={anyActing || isLocked}
                onClick={() => onRequestAction("restart")}
              >
                {isActing && actionState?.action === "restart" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
              </Button>

              {/* Remove / Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                title={isLocked ? "Action protected by lock" : "Remove container"}
                disabled={anyActing || isLocked}
                onClick={() => onRequestAction("remove")}
              >
                {isActing && actionState?.action === "remove" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
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
  const { can } = useNodePermissions(nodeId)
  const canAction = can(PERMS.CONTAINERS_ACTION)
  const canSettings = can(PERMS.CONTAINERS_SETTINGS)
  const canLogs = can(PERMS.LOGS_READ)
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
        toast.error("Could not save container order on server")
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
          ? `Actions locked for ${containerName}`
          : `Actions unlocked for ${containerName}`
      )
    } catch (err) {
      console.error("Failed to save container lock:", err)
      // Revert optimistic update
      const revertedLocks = { ...locksRef.current, [containerName]: currentLocked }
      locksRef.current = revertedLocks
      setLocks(revertedLocks)
      toast.error("Could not save lock configuration")
    }
  }

  const handleRequestAction = (containerName: string, action: ContainerAction) => {
    if (locksRef.current[containerName]) {
      toast.error(`Action blocked: container "${containerName}" is locked`)
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
      toast.error(err?.message || `Failed to run action on ${containerName}`)
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
                    canAction={canAction}
                    canSettings={canSettings}
                    canLogs={canLogs}
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
                  confirmModal.action === "stop" || confirmModal.action === "remove"
                    ? "bg-rose-500/15 text-rose-500"
                    : confirmModal.action === "restart"
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-green-500/15 text-green-500"
                }`}
              >
                {confirmModal.action === "stop" && <Square className="h-5 w-5" />}
                {confirmModal.action === "restart" && <RotateCcw className="h-5 w-5" />}
                {confirmModal.action === "start" && <Play className="h-5 w-5" />}
                {confirmModal.action === "remove" && <Trash2 className="h-5 w-5" />}
              </div>
              <AlertDialogTitle>
                {confirmModal.action === "start" && "Confirm Start"}
                {confirmModal.action === "stop" && "Confirm Stop"}
                {confirmModal.action === "restart" && "Confirm Restart"}
                {confirmModal.action === "remove" && "Confirm Removal"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2 text-sm text-foreground/80">
              {confirmModal.action === "start" && (
                <>
                  Are you sure you want to <strong>start</strong> container{" "}
                  <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-foreground font-semibold">
                    {confirmModal.containerName}
                  </code>?
                </>
              )}
              {confirmModal.action === "stop" && (
                <>
                  Are you sure you want to <strong>stop</strong> container{" "}
                  <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-foreground font-semibold">
                    {confirmModal.containerName}
                  </code>? The service will stop responding to requests.
                </>
              )}
              {confirmModal.action === "restart" && (
                <>
                  Are you sure you want to <strong>restart</strong> container{" "}
                  <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-foreground font-semibold">
                    {confirmModal.containerName}
                  </code>? It will experience a brief service interruption.
                </>
              )}
              {confirmModal.action === "remove" && (
                <>
                  Are you sure you want to <strong>permanently remove</strong> container{" "}
                  <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-foreground font-semibold">
                    {confirmModal.containerName}
                  </code>? If running, it will be stopped and deleted. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmModal.action === "stop" || confirmModal.action === "remove"
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : confirmModal.action === "restart"
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-green-600 text-white hover:bg-green-700"
              }
              onClick={handleConfirmAction}
            >
              {confirmModal.action === "start" && "Start"}
              {confirmModal.action === "stop" && "Stop"}
              {confirmModal.action === "restart" && "Restart"}
              {confirmModal.action === "remove" && "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

