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
import { GripVertical, Loader2, FileText, Play, Square, RotateCcw, Activity, ShieldCheck } from "lucide-react"
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
import type { DockerContainer } from "@/lib/types"
import type { ContainerAction } from "@/lib/features/nodes/containers/hooks/useContainers"
import { useRouter } from "next/navigation"

function storageKey(nodeId: string) {
  return `container-order:${nodeId}`
}

function loadOrder(nodeId: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey(nodeId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function saveOrder(nodeId: string, order: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(storageKey(nodeId), JSON.stringify(order))
  } catch {}
}

function applyStoredOrder(containers: DockerContainer[], stored: string[]): DockerContainer[] {
  if (stored.length === 0) return containers
  const map = new Map(containers.map((c) => [c.id, c]))
  const ordered: DockerContainer[] = []
  for (const id of stored) {
    const found = map.get(id)
    if (found) {
      ordered.push(found)
      map.delete(id)
    }
  }
  return [...ordered, ...Array.from(map.values())]
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
  onLog: () => void
  onMetrics: () => void
  onBackups: () => void
  onStart: () => void
  onStop: () => void
  onRestart: () => void
}

function SortableRow({ ctr, actionState, onLog, onMetrics, onBackups, onStart, onStop, onRestart }: SortableRowProps) {
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
          onClick={onMetrics}
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
            title="Respaldos R2/S3"
            onClick={onBackups}
          >
            <ShieldCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
            title="Métricas"
            onClick={onMetrics}
          >
            <Activity className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Logs" onClick={onLog}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8" title="Start"
            disabled={anyActing || isRunning} onClick={onStart}
          >
            {isActing && actionState?.action === "start"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8" title="Stop"
            disabled={anyActing || isExited} onClick={onStop}
          >
            {isActing && actionState?.action === "stop"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Square className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8" title="Restart"
            disabled={anyActing} onClick={onRestart}
          >
            {isActing && actionState?.action === "restart"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RotateCcw className="h-4 w-4" />}
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
  onAction: (name: string, action: ContainerAction) => void
}

export function SortableContainersTable({ nodeId, containers, actionState, onLog, onAction }: Props) {
  const router = useRouter()
  const [sorted, setSorted] = useState<DockerContainer[]>([])
  const initialised = useRef(false)

  useEffect(() => {
    const stored = loadOrder(nodeId)
    setSorted(applyStoredOrder(containers, stored))
    initialised.current = true
  }, [nodeId, containers])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSorted((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id)
      const newIndex = prev.findIndex((c) => c.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      saveOrder(nodeId, next.map((c) => c.id))
      return next
    })
  }

  if (sorted.length === 0) return null

  return (
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
                  onMetrics={() => router.push(`/node/${nodeId}/containers/${encodeURIComponent(ctr.name)}`)}
                  onBackups={() => router.push(`/node/${nodeId}/containers/${encodeURIComponent(ctr.name)}?tab=backups`)}
                  onLog={() => onLog(ctr.name)}
                  onStart={() => onAction(ctr.name, "start")}
                  onStop={() => onAction(ctr.name, "stop")}
                  onRestart={() => onAction(ctr.name, "restart")}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </SortableContext>
    </DndContext>
  )
}
