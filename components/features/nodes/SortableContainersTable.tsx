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
import { GripVertical, Loader2, FileText, Play, Square, RotateCcw } from "lucide-react"
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
import type { ContainerAction } from "@/lib/hooks/useContainers"

// ── persist order per node in localStorage ───────────────────────────────────

function storageKey(nodeId: string) {
  return `container-order:${nodeId}`
}

function loadOrder(nodeId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(nodeId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function saveOrder(nodeId: string, ids: string[]) {
  try {
    localStorage.setItem(storageKey(nodeId), JSON.stringify(ids))
  } catch {
    // ignore
  }
}

function applyStoredOrder(containers: DockerContainer[], stored: string[]): DockerContainer[] {
  if (stored.length === 0) return containers
  const map = new Map(containers.map((c) => [c.id, c]))
  const ordered: DockerContainer[] = []
  for (const id of stored) {
    const c = map.get(id)
    if (c) { ordered.push(c); map.delete(id) }
  }
  // append any new containers not in stored order
  for (const c of map.values()) ordered.push(c)
  return ordered
}

// ── Container state badge ────────────────────────────────────────────────────

function ContainerStateBadge({ state }: { state: string }) {
  if (state === "running") {
    return <Badge className="bg-success text-black text-xs">🟢 running</Badge>
  }
  if (state === "exited" || state === "stopped") {
    return <Badge variant="destructive" className="text-xs">🔴 {state}</Badge>
  }
  return <Badge variant="secondary" className="text-xs">{state}</Badge>
}

// ── Single sortable row ──────────────────────────────────────────────────────

interface SortableRowProps {
  ctr: DockerContainer
  actionState: { name: string; action: ContainerAction } | null
  onLog: () => void
  onStart: () => void
  onStop: () => void
  onRestart: () => void
}

function SortableRow({ ctr, actionState, onLog, onStart, onStop, onRestart }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ctr.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isActing = actionState?.name === ctr.name
  const anyActing = actionState !== null
  const isRunning = ctr.state === "running"
  const isExited = ctr.state === "exited" || ctr.state === "stopped"

  return (
    <TableRow ref={setNodeRef} style={style}>
      {/* Drag handle */}
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
      <TableCell className="font-mono font-medium text-sm">{ctr.name}</TableCell>
      <TableCell>
        <ContainerStateBadge state={ctr.state} />
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
            disabled={anyActing || isExited} onClick={onRestart}
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

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  nodeId: string
  containers: DockerContainer[]
  actionState: { name: string; action: ContainerAction } | null
  onLog: (name: string) => void
  onAction: (name: string, action: ContainerAction) => void
}

export function SortableContainersTable({ nodeId, containers, actionState, onLog, onAction }: Props) {
  const [sorted, setSorted] = useState<DockerContainer[]>([])
  const initialised = useRef(false)

  // Sync with incoming containers while preserving stored order
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
