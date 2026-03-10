"use client"

import { Fragment, use, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Play,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from "lucide-react"
import { useNodeCommands } from "@/lib/hooks/useNodeCommands"
import { useNodeJobs, useJobDispatch } from "@/lib/hooks/useNodeJobs"
import type { NodeCommand, Job, JobStatus } from "@/lib/types"

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

export default function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()

  const { commands, isLoading: cmdsLoading, error: cmdsError, refresh: refreshCommands } = useNodeCommands(nodeId)
  const customCommands = commands.filter((c) => c.type === "custom")
  const { jobs, isLoading: jobsLoading, error: jobsError, refresh: refreshJobs } = useNodeJobs(nodeId)
  const { dispatch, isDispatching, activeJob } = useJobDispatch()

  const [expandedJob, setExpandedJob] = useState<string | null>(null)

  const handleExecute = async (cmd: NodeCommand) => {
    try {
      await dispatch(nodeId, cmd.name, cmd.type)
      // Refresh jobs list after dispatch
      setTimeout(() => refreshJobs(), 1000)
    } catch (err) {
      console.error("Failed to dispatch job:", err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Node Detail</h2>
          <p className="text-sm text-muted-foreground font-mono">{nodeId}</p>
        </div>
      </div>

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
