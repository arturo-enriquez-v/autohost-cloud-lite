"use client"

import { Terminal, RefreshCw, Loader2, Play, CheckCircle2, XCircle, Clock, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { NodeCommand, JobStatus } from "../../../lib/features/nodes/types"
import { useNodeCommands } from "@/lib/features/nodes/commands/hooks/useNodeCommands"
import { useJobDispatch } from "@/lib/features/nodes/jobs/hooks/useNodeJobs"

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

interface CommandsPanelProps {
  nodeId: string
  onJobDispatched?: () => void
}

export function CommandsPanel({ nodeId, onJobDispatched }: CommandsPanelProps) {
  const { commands, isLoading, error, refresh } = useNodeCommands(nodeId)
  const { dispatch, isDispatching, activeJob } = useJobDispatch()

  const customCommands = commands.filter((c) => c.type === "custom")

  const handleExecute = async (cmd: NodeCommand) => {
    try {
      await dispatch(nodeId, cmd.name, cmd.type)
      onJobDispatched?.()
    } catch (err) {
      console.error("Failed to dispatch job:", err)
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Terminal className="h-5 w-5 shrink-0" />
            Commands
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : customCommands.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No custom commands on this node. Use{" "}
              <code className="bg-muted px-1 rounded">autohost cc create</code> on the node to add commands.
            </p>
          ) : (
            <div className="overflow-x-auto">
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
                      <TableCell className="font-mono font-medium text-xs sm:text-sm">{cmd.name}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-muted-foreground">{cmd.description || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleExecute(cmd)}
                          disabled={isDispatching}
                          className="gap-1 text-xs"
                        >
                          {isDispatching ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          Execute
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {activeJob && (
        <Card className="border-blue-500/30 lg:col-span-2 overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base flex-wrap">
              <Zap className="h-5 w-5 shrink-0" />
              Latest Execution: <span className="font-mono">{activeJob.commandName}</span>
              <StatusBadge status={activeJob.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {(activeJob.status === "pending" || activeJob.status === "running") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for result from node...
              </div>
            )}
            {activeJob.output && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                <pre className="bg-muted p-3 rounded-md text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap max-w-full">{activeJob.output}</pre>
              </div>
            )}
            {activeJob.error && (
              <div className="mt-2">
                <p className="text-xs font-medium text-destructive mb-1">Error</p>
                <pre className="bg-destructive/10 p-3 rounded-md text-xs sm:text-sm text-destructive overflow-x-auto whitespace-pre-wrap max-w-full">{activeJob.error}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
