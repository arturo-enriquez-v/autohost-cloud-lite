"use client"

import { Fragment, use, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Bell,
  Box,
  Check,
  Play,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Send,
  Square,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from "lucide-react"
import { useNodeCommands } from "@/lib/hooks/useNodeCommands"
import { useNodeJobs, useJobDispatch } from "@/lib/hooks/useNodeJobs"
import { useNodeAlerts } from "@/lib/hooks/useNodeAlerts"
import { useContainers } from "@/lib/hooks/useContainers"
import type { NodeCommand, Job, JobStatus, Container } from "@/lib/types"

function StatusBadge({ status }: { status: JobStatus }) {
  const config: Record<JobStatus, { icon: React.ReactNode; label: string; className: string }> = {
    pending: { icon: <Clock className="h-3 w-3" />, label: "Pending", className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
    running: { icon: <Loader2 className="h-3 w-3 animate-spin" />, label: "Running", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
    completed: { icon: <CheckCircle2 className="h-3 w-3" />, label: "Completed", className: "bg-green-500/15 text-green-600 border-green-500/30" },
    failed: { icon: <XCircle className="h-3 w-3" />, label: "Failed", className: "bg-red-500/15 text-red-600 border-red-500/30" },
  }
  const c = config[status]
  return (
    <Badge variant="outline" className={c.className}>
      {c.icon}
      {c.label}
    </Badge>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString()
}

function ContainerStateBadge({ state }: { state: string }) {
  const cfg: Record<string, string> = {
    running: "bg-green-500/15 text-green-600 border-green-500/30",
    exited: "bg-muted text-muted-foreground",
    paused: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    restarting: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  }
  return (
    <Badge variant="outline" className={cfg[state] ?? "bg-muted text-muted-foreground"}>
      {state}
    </Badge>
  )
}

export default function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()

  const { commands, isLoading: cmdsLoading, error: cmdsError, refresh: refreshCommands } = useNodeCommands(nodeId)
  const customCommands = commands.filter((c) => c.type === "custom")
  const { jobs, isLoading: jobsLoading, error: jobsError, refresh: refreshJobs } = useNodeJobs(nodeId)
  const { dispatch, isDispatching, activeJob } = useJobDispatch()
  const { config: alertConfig, isLoading: alertsLoading, isSaving: alertsSaving, saved: alertsSaved, error: alertsError, save: saveAlerts } = useNodeAlerts(nodeId)
  const { containers, isRefreshing: containersRefreshing, lastRefreshed: containersRefreshedAt, refreshError: containersError, actionState: containerAction, refresh: refreshContainers, runAction: runContainerAction } = useContainers(nodeId)

  const [expandedJob, setExpandedJob] = useState<string | null>(null)

  // Local form state for the alerts section
  const [alertForm, setAlertForm] = useState({
    telegramBotToken: "",
    telegramChatId: "",
    cpuThreshold: "" as string,
    ramThreshold: "" as string,
    diskThreshold: "" as string,
    alertOnOffline: false,
  })
  // Sync alert config into form once loaded
  const [alertFormSynced, setAlertFormSynced] = useState(false)
  if (!alertsLoading && !alertFormSynced) {
    setAlertFormSynced(true)
    setAlertForm({
      telegramBotToken: alertConfig.telegramBotToken ?? "",
      telegramChatId: alertConfig.telegramChatId ?? "",
      cpuThreshold: alertConfig.cpuThreshold != null ? String(alertConfig.cpuThreshold) : "",
      ramThreshold: alertConfig.ramThreshold != null ? String(alertConfig.ramThreshold) : "",
      diskThreshold: alertConfig.diskThreshold != null ? String(alertConfig.diskThreshold) : "",
      alertOnOffline: alertConfig.alertOnOffline ?? false,
    })
  }

  const handleExecute = async (cmd: NodeCommand) => {
    try {
      await dispatch(nodeId, cmd.name, cmd.type)
      // Refresh jobs list after dispatch
      setTimeout(() => refreshJobs(), 1000)
    } catch (err) {
      console.error("Failed to dispatch job:", err)
    }
  }

  const handleSaveAlerts = async () => {
    const parseThreshold = (v: string) => {
      const n = parseFloat(v)
      return isNaN(n) ? null : Math.min(100, Math.max(0, n))
    }
    await saveAlerts({
      telegramBotToken: alertForm.telegramBotToken,
      telegramChatId: alertForm.telegramChatId,
      cpuThreshold: parseThreshold(alertForm.cpuThreshold),
      ramThreshold: parseThreshold(alertForm.ramThreshold),
      diskThreshold: parseThreshold(alertForm.diskThreshold),
      alertOnOffline: alertForm.alertOnOffline,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">Node Detail</h2>
          <p className="text-sm text-muted-foreground font-mono">{nodeId}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push(`/node/${nodeId}/logs`)} className="gap-2">
          <ScrollText className="h-4 w-4" />
          Live Logs
        </Button>
      </div>

      {/* Docker Containers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 shrink-0" />
              Containers
            </CardTitle>
            {containersRefreshedAt && (
              <CardDescription className="mt-1">
                Updated {containersRefreshedAt.toLocaleTimeString()}
              </CardDescription>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshContainers}
            disabled={containersRefreshing || containerAction !== null}
            className="shrink-0 gap-2"
          >
            {containersRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {containersRefreshing ? "Loading…" : "Refresh"}
            </span>
          </Button>
        </CardHeader>
        <CardContent>
          {containersError ? (
            <p className="text-sm text-destructive">{containersError}</p>
          ) : containersRefreshing && containers.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : containers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Click <strong>Refresh</strong> to load Docker containers from this node.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Image</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containers.map((ctr: Container) => {
                    const isActing = containerAction?.name === ctr.name
                    const isRunning = ctr.state === "running"
                    const isExited = ctr.state === "exited"
                    const anyActing = containerAction !== null
                    return (
                      <TableRow key={ctr.id}>
                        <TableCell className="font-mono font-medium text-sm">{ctr.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[200px] truncate">
                          {ctr.image}
                        </TableCell>
                        <TableCell>
                          <ContainerStateBadge state={ctr.state} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Start"
                              disabled={anyActing || isRunning}
                              onClick={() => runContainerAction(ctr.name, "start")}
                            >
                              {isActing && containerAction?.action === "start" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Stop"
                              disabled={anyActing || isExited}
                              onClick={() => runContainerAction(ctr.name, "stop")}
                            >
                              {isActing && containerAction?.action === "stop" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Restart"
                              disabled={anyActing || isExited}
                              onClick={() => runContainerAction(ctr.name, "restart")}
                            >
                              {isActing && containerAction?.action === "restart" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alerts
          </CardTitle>
          <CardDescription>
            Receive Telegram notifications when metrics exceed thresholds or the node goes offline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Telegram credentials */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Telegram</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tg-bot-token">Bot Token</Label>
                    <Input
                      id="tg-bot-token"
                      type="password"
                      placeholder="1234567890:AABBccDDeeFFggHHii..."
                      value={alertForm.telegramBotToken}
                      onChange={(e) => setAlertForm((f) => ({ ...f, telegramBotToken: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tg-chat-id">Chat ID</Label>
                    <Input
                      id="tg-chat-id"
                      placeholder="-100123456789"
                      value={alertForm.telegramChatId}
                      onChange={(e) => setAlertForm((f) => ({ ...f, telegramChatId: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Metric thresholds */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">
                  Thresholds <span className="text-muted-foreground font-normal">(0–100 %, leave empty to disable)</span>
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {(
                    [
                      { id: "cpu", label: "CPU %", key: "cpuThreshold" },
                      { id: "ram", label: "RAM %", key: "ramThreshold" },
                      { id: "disk", label: "Disk %", key: "diskThreshold" },
                    ] as const
                  ).map(({ id, label, key }) => (
                    <div key={id} className="space-y-2">
                      <Label htmlFor={`threshold-${id}`}>{label}</Label>
                      <Input
                        id={`threshold-${id}`}
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        placeholder="e.g. 85"
                        value={alertForm[key]}
                        onChange={(e) => setAlertForm((f) => ({ ...f, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Offline alert toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="alert-offline" className="text-sm font-medium">Alert when node goes offline</Label>
                  <p className="text-xs text-muted-foreground">
                    A Telegram message is sent 30 s after the node loses its connection.
                  </p>
                </div>
                <Switch
                  id="alert-offline"
                  checked={alertForm.alertOnOffline}
                  onCheckedChange={(v) => setAlertForm((f) => ({ ...f, alertOnOffline: v }))}
                />
              </div>

              {alertsError && (
                <p className="text-sm text-destructive">{alertsError}</p>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveAlerts} disabled={alertsSaving} className="gap-2">
                  {alertsSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : alertsSaved ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {alertsSaving ? "Saving…" : alertsSaved ? "Saved!" : "Save Alerts"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commands card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Commands
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refreshCommands}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {cmdsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cmdsError ? (
            <p className="text-destructive text-sm">{cmdsError}</p>
          ) : customCommands.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No custom commands on this node. Use <code className="bg-muted px-1 rounded">autohost cc create</code> on the node to add commands.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customCommands.map((cmd) => (
                  <TableRow key={cmd.id}>
                    <TableCell className="font-mono font-medium">{cmd.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cmd.description || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleExecute(cmd)}
                        disabled={isDispatching}
                      >
                        {isDispatching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Execute
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Active job result */}
      {activeJob && (
        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5" />
              Latest Execution: <span className="font-mono">{activeJob.commandName}</span>
              <StatusBadge status={activeJob.status} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(activeJob.status === "pending" || activeJob.status === "running") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for result from node...
              </div>
            )}
            {activeJob.output && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">{activeJob.output}</pre>
              </div>
            )}
            {activeJob.error && (
              <div className="mt-2">
                <p className="text-xs font-medium text-destructive mb-1">Error</p>
                <pre className="bg-destructive/10 p-3 rounded-md text-sm text-destructive overflow-x-auto whitespace-pre-wrap">{activeJob.error}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Job history */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Job History</CardTitle>
          <Button variant="outline" size="sm" onClick={refreshJobs}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobsError ? (
            <p className="text-destructive text-sm">{jobsError}</p>
          ) : jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No jobs executed yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Command</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {jobs.map((job) => (
                    <Fragment key={job.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedJob(expandedJob === job.id ? null : job.id)
                        }
                      >
                        <TableCell className="font-mono font-medium">
                          {job.commandName}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline">{job.commandType}</Badge>
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={job.status} />
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(job.createdAt)}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm">
                          {job.startedAt && job.finishedAt
                            ? `${(
                              (new Date(job.finishedAt).getTime() -
                                new Date(job.startedAt).getTime()) /
                              1000
                            ).toFixed(1)}s`
                            : "—"}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            {expandedJob === job.id ? "Hide" : "Show"}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {expandedJob === job.id && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/50">
                            <div className="p-2 space-y-2">
                              {job.output && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Output
                                  </p>
                                  <pre className="bg-background p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
                                    {job.output}
                                  </pre>
                                </div>
                              )}

                              {job.error && (
                                <div>
                                  <p className="text-xs font-medium text-destructive mb-1">
                                    Error
                                  </p>
                                  <pre className="bg-destructive/10 p-3 rounded-md text-sm text-destructive overflow-x-auto whitespace-pre-wrap">
                                    {job.error}
                                  </pre>
                                </div>
                              )}

                              {!job.output && !job.error && (
                                <p className="text-sm text-muted-foreground">
                                  No output available.
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
