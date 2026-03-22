"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Plus, Trash2, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { useNodes } from "@/lib/hooks/useNodes"
import { useScheduledTasks } from "@/lib/hooks/useScheduledTasks"
import type { NodeCommand, ScheduledTask, ScheduleType } from "@/lib/types"
import { fetchWithAuth } from "@/lib/api/fetch-client"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSchedule(task: ScheduledTask): string {
  if (task.scheduleType === "daily") {
    return `Daily at ${task.runAtTime ?? "??"} UTC`
  }
  const secs = task.intervalSeconds ?? 0
  if (secs < 60) return `Every ${secs}s`
  if (secs < 3600) {
    const m = secs / 60
    return `Every ${Number.isInteger(m) ? m : m.toFixed(1)}min`
  }
  const h = secs / 3600
  return `Every ${Number.isInteger(h) ? h : h.toFixed(1)}h`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString()
}

type JobStatus = "pending" | "running" | "completed" | "failed"

function jobStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status as JobStatus) {
    case "completed": return "default"
    case "running":   return "outline"
    case "failed":    return "destructive"
    default:          return "secondary"
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const { nodes, isLoading: nodesLoading } = useNodes()
  const { tasks, isLoading: tasksLoading, create, remove, toggle } = useScheduledTasks()

  // Form — base
  const [selectedNodeId, setSelectedNodeId]       = useState("")
  const [selectedCommandId, setSelectedCommandId] = useState("")
  const [selectedCommandName, setSelectedCommandName] = useState("")
  const [scheduleType, setScheduleType]           = useState<ScheduleType>("interval")

  // Form — interval
  const [intervalValue, setIntervalValue] = useState("60")
  const [intervalUnit, setIntervalUnit]   = useState<"seconds" | "minutes" | "hours">("minutes")

  // Form — daily
  const [runAtTime, setRunAtTime] = useState("12:00")

  const [isCreating, setIsCreating] = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)

  // Last-log expand state per task id
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  // Commands for selected node
  const [nodeCommands, setNodeCommands]     = useState<NodeCommand[]>([])
  const [commandsLoading, setCommandsLoading] = useState(false)

  const fetchCommandsForNode = useCallback(async (nodeId: string) => {
    if (!nodeId) { setNodeCommands([]); return }
    setCommandsLoading(true)
    try {
      const res = await fetchWithAuth(`/api/nodes/${nodeId}/commands`)
      if (!res.ok) throw new Error()
      const data: NodeCommand[] = await res.json()
      setNodeCommands(data.filter((c) => c.type === "custom"))
    } catch {
      setNodeCommands([])
    } finally {
      setCommandsLoading(false)
    }
  }, [])

  useEffect(() => {
    setSelectedCommandId("")
    setSelectedCommandName("")
    fetchCommandsForNode(selectedNodeId)
  }, [selectedNodeId, fetchCommandsForNode])

  const toIntervalSeconds = (): number => {
    const v = parseInt(intervalValue, 10) || 1
    if (intervalUnit === "seconds") return v
    if (intervalUnit === "minutes") return v * 60
    return v * 3600
  }

  const handleCreate = async () => {
    if (!selectedNodeId || !selectedCommandId) {
      setFormError("Select a node and a command.")
      return
    }
    if (scheduleType === "interval" && (parseInt(intervalValue, 10) || 0) <= 0) {
      setFormError("Interval must be greater than 0.")
      return
    }
    setFormError(null)
    setIsCreating(true)
    try {
      await create({
        nodeId: selectedNodeId,
        commandId: selectedCommandId,
        commandName: selectedCommandName,
        scheduleType,
        intervalSeconds: scheduleType === "interval" ? toIntervalSeconds() : undefined,
        runAtTime: scheduleType === "daily" ? runAtTime : undefined,
      })
      setSelectedNodeId("")
      setSelectedCommandId("")
      setSelectedCommandName("")
      setIntervalValue("60")
      setIntervalUnit("minutes")
      setRunAtTime("12:00")
      setScheduleType("interval")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create task")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (task: ScheduledTask) => {
    if (!confirm(`Delete scheduled task for "${task.commandName}"?`)) return
    try { await remove(task.id) } catch { /* ignore */ }
  }

  const handleToggle = async (task: ScheduledTask) => {
    try { await toggle(task.id) } catch { /* ignore */ }
  }

  const nodeName = (nodeId: string) => nodes.find((n) => n.id === nodeId)?.name ?? nodeId

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Scheduled Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Run custom commands on your nodes on a recurring schedule
        </p>
      </div>

      {/* ── New Schedule Form ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

            {/* Node */}
            <div className="space-y-1.5">
              <Label>Node</Label>
              <Select value={selectedNodeId} onValueChange={setSelectedNodeId} disabled={nodesLoading}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select node…" /></SelectTrigger>
                <SelectContent>
                  {nodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>{node.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Command */}
            <div className="space-y-1.5">
              <Label>Command</Label>
              <Select
                value={selectedCommandId}
                onValueChange={(val) => {
                  setSelectedCommandId(val)
                  setSelectedCommandName(nodeCommands.find((c) => c.id === val)?.name ?? "")
                }}
                disabled={!selectedNodeId || commandsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    commandsLoading ? "Loading…"
                    : !selectedNodeId ? "Select node first"
                    : nodeCommands.length === 0 ? "No custom commands"
                    : "Select command…"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {nodeCommands.map((cmd) => (
                    <SelectItem key={cmd.id} value={cmd.id}>{cmd.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule type */}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interval">Interval</SelectItem>
                  <SelectItem value="daily">Daily at time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Frequency — conditional */}
            {scheduleType === "interval" ? (
              <div className="space-y-1.5">
                <Label>Every</Label>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    min="1"
                    value={intervalValue}
                    onChange={(e) => setIntervalValue(e.target.value)}
                    className="w-20"
                  />
                  <Select value={intervalUnit} onValueChange={(v) => setIntervalUnit(v as typeof intervalUnit)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">Seconds</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Time <span className="text-xs text-muted-foreground">(UTC)</span></Label>
                <Input
                  type="time"
                  value={runAtTime}
                  onChange={(e) => setRunAtTime(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleCreate}
              disabled={isCreating || !selectedNodeId || !selectedCommandId}
            >
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Schedule
            </Button>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
        </CardContent>
      </Card>

      {/* ── Scheduled Tasks Table ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Schedules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No scheduled tasks yet. Create one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node</TableHead>
                  <TableHead>Command</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Last Log</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <TableRow>
                      <TableCell className="font-medium">{nodeName(task.nodeId)}</TableCell>
                      <TableCell className="font-mono text-sm">{task.commandName}</TableCell>
                      <TableCell className="text-sm">{formatSchedule(task)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(task.lastRunAt)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(task.nextRunAt)}</TableCell>

                      {/* Last log cell */}
                      <TableCell>
                        {task.lastJobStatus ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={jobStatusVariant(task.lastJobStatus)}
                              className={task.lastJobStatus === "completed" ? "bg-success text-black" : ""}
                            >
                              {task.lastJobStatus}
                            </Badge>
                            {(task.lastJobOutput || task.lastJobError) && (
                              <button
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => setExpandedLog(expandedLog === task.id ? null : task.id)}
                              >
                                {expandedLog === task.id
                                  ? <ChevronUp className="h-4 w-4" />
                                  : <ChevronDown className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={task.enabled} onCheckedChange={() => handleToggle(task)} />
                          <Badge
                            variant={task.enabled ? "default" : "secondary"}
                            className={task.enabled ? "bg-success text-black" : ""}
                          >
                            {task.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(task)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded log row */}
                    {expandedLog === task.id && (
                      <TableRow key={`${task.id}-log`} className="bg-muted/30">
                        <TableCell colSpan={8} className="py-3">
                          {task.lastJobOutput && (
                            <div className="mb-2">
                              <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Output</p>
                              <pre className="whitespace-pre-wrap rounded bg-background p-3 text-xs font-mono border border-border max-h-48 overflow-y-auto">
                                {task.lastJobOutput}
                              </pre>
                            </div>
                          )}
                          {task.lastJobError && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-destructive uppercase tracking-wide">Error</p>
                              <pre className="whitespace-pre-wrap rounded bg-background p-3 text-xs font-mono border border-destructive/30 max-h-48 overflow-y-auto text-destructive">
                                {task.lastJobError}
                              </pre>
                            </div>
                          )}
                          {task.lastJobFinishedAt && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Finished: {formatDate(task.lastJobFinishedAt)}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
