"use client"

import { Fragment, use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Box,
  ChevronLeft,
  ChevronRight,
  Play,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Settings,
  Square,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Wifi,
  WifiOff,
  Network,
  Server,
} from "lucide-react"
import { useNode } from "@/lib/hooks/useNode"
import { useNodeCommands } from "@/lib/hooks/useNodeCommands"
import { useNodeJobs, useJobDispatch } from "@/lib/hooks/useNodeJobs"
import { useContainers } from "@/lib/hooks/useContainers"
import type { NodeCommand, Job, JobStatus, DockerContainer } from "@/lib/types"

const JOBS_PER_PAGE = 10

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

  const { node, isLoading: nodeLoading } = useNode(nodeId)
  const { commands, isLoading: cmdsLoading, error: cmdsError, refresh: refreshCommands } = useNodeCommands(nodeId)
  const customCommands = commands.filter((c) => c.type === "custom")
  const { jobs, isLoading: jobsLoading, error: jobsError, refresh: refreshJobs } = useNodeJobs(nodeId)
  const { dispatch, isDispatching, activeJob } = useJobDispatch()
  const { containers, isRefreshing: containersRefreshing, lastRefreshed: containersRefreshedAt, refreshError: containersError, actionState: containerAction, refresh: refreshContainers, runAction: runContainerAction } = useContainers(nodeId)

  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [jobsPage, setJobsPage] = useState(1)

  // Auto-fetch containers on mount
  useEffect(() => {
    refreshContainers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId])

  // Reset to page 1 when jobs reload
  useEffect(() => {
    setJobsPage(1)
  }, [jobs.length])

  const handleExecute = async (cmd: NodeCommand) => {
    try {
      await dispatch(nodeId, cmd.name, cmd.type)
      // Refresh jobs list after dispatch
      setTimeout(() => refreshJobs(), 1000)
    } catch (err) {
      console.error("Failed to dispatch job:", err)
    }
  }

  // Pagination for job history
  const totalPages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE))
  const pagedJobs = jobs.slice((jobsPage - 1) * JOBS_PER_PAGE, jobsPage * JOBS_PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground truncate">
              {nodeLoading ? (
                <span className="text-muted-foreground">Loading…</span>
              ) : node?.name ? (
                node.name
              ) : (
                "Node Detail"
              )}
            </h2>
            {!nodeLoading && node && (
              <Badge
                variant="outline"
                className={
                  node.status === "online"
                    ? "bg-green-500/15 text-green-600 border-green-500/30 shrink-0"
                    : "bg-muted text-muted-foreground shrink-0"
                }
              >
                {node.status === "online" ? (
                  <Wifi className="h-3 w-3 mr-1" />
                ) : (
                  <WifiOff className="h-3 w-3 mr-1" />
                )}
                {node.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <Server className="h-3 w-3" />
              {nodeId}
            </span>
            {!nodeLoading && node?.ipLocal && (
              <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                <Network className="h-3 w-3" />
                {node.ipLocal}
              </span>
            )}
            {!nodeLoading && node?.os && (
              <span className="text-xs text-muted-foreground">
                {node.os}{node.arch && ` · ${node.arch}`}
              </span>
            )}
            {!nodeLoading && node?.versionAgent && (
              <span className="text-xs text-muted-foreground">
                agent {node.versionAgent}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.push(`/node/${nodeId}/config`)} className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/node/${nodeId}/logs`)} className="gap-2">
            <ScrollText className="h-4 w-4" />
            <span className="hidden sm:inline">Live Logs</span>
          </Button>
        </div>
      </div>

      {/* Containers + Commands side by side on larger screens */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Docker Containers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5 shrink-0" />
                Containers
                {containers.length > 0 && (
                  <Badge variant="outline" className="text-xs">{containers.length}</Badge>
                )}
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
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
                Fetching containers from node…
              </div>
            ) : containers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No containers found. Click <strong>Refresh</strong> to reload.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {containers.map((ctr: DockerContainer) => {
                      const isActing = containerAction?.name === ctr.name
                      const isRunning = ctr.state === "running"
                      const isExited = ctr.state === "exited"
                      const anyActing = containerAction !== null
                      return (
                        <TableRow key={ctr.id}>
                          <TableCell className="font-mono font-medium text-sm">{ctr.name}</TableCell>
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

        {/* Commands card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Commands
            </CardTitle>
            <Button variant="outline" size="sm" onClick={refreshCommands} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
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
                          className="gap-1"
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

      </div>{/* end grid Containers + Commands */}

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
          <div>
            <CardTitle>Job History</CardTitle>
            {jobs.length > 0 && (
              <CardDescription className="mt-1">
                {jobs.length} job{jobs.length !== 1 ? "s" : ""} total
              </CardDescription>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={refreshJobs} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
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
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Command</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    <TableHead className="hidden sm:table-cell">Duration</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedJobs.map((job: Job) => (
                    <Fragment key={job.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                      >
                        <TableCell className="font-mono font-medium">{job.commandName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.commandType}</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={job.status} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {formatDate(job.createdAt)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {job.startedAt && job.finishedAt
                            ? `${((new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()) / 1000).toFixed(1)}s`
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
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                                  <pre className="bg-background p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">{job.output}</pre>
                                </div>
                              )}
                              {job.error && (
                                <div>
                                  <p className="text-xs font-medium text-destructive mb-1">Error</p>
                                  <pre className="bg-destructive/10 p-3 rounded-md text-sm text-destructive overflow-x-auto whitespace-pre-wrap">{job.error}</pre>
                                </div>
                              )}
                              {!job.output && !job.error && (
                                <p className="text-sm text-muted-foreground">No output available.</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {jobsPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                      disabled={jobsPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setJobsPage((p) => Math.min(totalPages, p + 1))}
                      disabled={jobsPage === totalPages}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
