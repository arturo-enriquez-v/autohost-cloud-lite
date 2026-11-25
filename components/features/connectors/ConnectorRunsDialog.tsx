// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConnectorsService } from "@/lib/features/connectors/services/connectors.service"
import type { Connector, ConnectorRun } from "@/lib/features/connectors/interfaces/connector"
import { formatDuration } from "./format"

export function ConnectorRunsDialog({
  connector,
  open,
  onOpenChange,
}: {
  connector: Connector
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [runs, setRuns] = useState<ConnectorRun[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setRuns(null)
    setError(null)
    ConnectorsService.runs(connector.id)
      .then(setRuns)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load runs"))
  }, [open, connector.id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Run history · {connector.name}</DialogTitle>
          <DialogDescription>Latest runs first. The last 200 are kept.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!runs && !error && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {runs && runs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No runs yet.</p>}
        {runs && runs.length > 0 && (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Params</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={r.ok ? "default" : "destructive"} className={r.ok ? "bg-success text-black" : ""}>
                        {r.status_code ? `HTTP ${r.status_code}` : "failed"}
                      </Badge>
                      {r.error && <p className="mt-1 max-w-xs text-xs text-destructive">{r.error}</p>}
                    </TableCell>
                    <TableCell className="text-xs">{formatDuration(r.duration_ms)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {Object.entries(r.params).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
