"use client"

import { Fragment, useState, useEffect } from "react"
import { RefreshCw, Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Job, JobStatus } from "../../../lib/features/nodes/types"
import { useNodeJobs } from "@/lib/features/nodes/jobs/hooks/useNodeJobs"

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

interface JobHistoryPanelProps {
  nodeId: string
  /** Increment this to trigger a refresh (e.g. after a job is dispatched). */
  refreshTrigger?: number
}

export function JobHistoryPanel({ nodeId, refreshTrigger }: JobHistoryPanelProps) {
  const { jobs, isLoading, error, refresh } = useNodeJobs(nodeId)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // Reset to page 1 when jobs list changes
  useEffect(() => {
    setPage(1)
  }, [jobs.length])

  // Re-fetch when parent signals a new dispatch
  useEffect(() => {
    if (refreshTrigger === undefined || refreshTrigger === 0) return
    refresh()
  }, [refreshTrigger, refresh])

  const totalPages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE))
  const pagedJobs = jobs.slice((page - 1) * JOBS_PER_PAGE, page * JOBS_PER_PAGE)

  return (
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
        <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">{error}</p>
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
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
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
  )
}
