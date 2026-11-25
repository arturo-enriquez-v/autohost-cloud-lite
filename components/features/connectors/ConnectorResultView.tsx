// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { AlertTriangle, Clock, Database } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ConnectorMapped, ConnectorResult, ConnectorView } from "@/lib/features/connectors/interfaces/connector"
import { formatCell, formatDuration, formatJSON } from "./format"

export function ResultStatus({ result }: { result: ConnectorResult }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge
        variant={result.ok ? "default" : "destructive"}
        className={result.ok ? "bg-success text-black" : ""}
      >
        HTTP {result.status_code}
      </Badge>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatDuration(result.duration_ms)}
      </span>
      {result.cached && (
        <span className="inline-flex items-center gap-1" title={`Fetched at ${new Date(result.fetched_at).toLocaleString()}`}>
          <Database className="h-3 w-3" />
          cached
        </span>
      )}
      {result.truncated && <span>response truncated at 1 MiB</span>}
    </div>
  )
}

function MappedTable({ mapped }: { mapped: ConnectorMapped }) {
  if (mapped.rows.length === 0) return <p className="text-sm text-muted-foreground">No items.</p>
  return (
    <div className="max-h-80 overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {mapped.columns.map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {mapped.rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={j} className="max-w-[24rem] truncate font-mono text-xs" title={formatCell(cell)}>
                  {formatCell(cell)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MappedValue({ mapped }: { mapped: ConnectorMapped }) {
  const row = mapped.rows[0]
  if (!row) return <p className="text-sm text-muted-foreground">No value.</p>
  if (row.length === 1) {
    return <p className="text-3xl font-semibold tabular-nums break-all">{formatCell(row[0])}</p>
  }
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {mapped.columns.map((c, i) => (
        <div key={c} className="contents">
          <dt className="text-muted-foreground">{c}</dt>
          <dd className="font-medium break-all">{formatCell(row[i])}</dd>
        </div>
      ))}
    </dl>
  )
}

function MappedList({ mapped }: { mapped: ConnectorMapped }) {
  if (mapped.rows.length === 0) return <p className="text-sm text-muted-foreground">No items.</p>
  return (
    <ul className="max-h-80 space-y-1 overflow-auto text-sm">
      {mapped.rows.map((row, i) => (
        <li key={i} className="flex gap-2 rounded px-2 py-1 odd:bg-muted/40">
          <span className="font-medium break-all">{formatCell(row[0])}</span>
          {row.length > 1 && (
            <span className="text-muted-foreground break-all">{row.slice(1).map(formatCell).join(" · ")}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function RawBody({ body }: { body: unknown }) {
  if (body === undefined || body === null || body === "") {
    return <p className="text-sm text-muted-foreground">Empty response.</p>
  }
  return (
    <pre className="max-h-80 overflow-auto rounded-md bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap break-all">
      {formatJSON(body)}
    </pre>
  )
}

/** Shows a connector result the way the connector's response mapping says. */
export function ConnectorResultView({ result, view = "json" }: { result: ConnectorResult; view?: ConnectorView }) {
  const mapped = result.mapped
  let content
  if (mapped && view === "value") content = <MappedValue mapped={mapped} />
  else if (mapped && view === "list") content = <MappedList mapped={mapped} />
  else if (mapped && (view === "table" || result.body === undefined)) content = <MappedTable mapped={mapped} />
  else content = <RawBody body={result.body} />

  return (
    <div className="space-y-2">
      <ResultStatus result={result} />
      {result.mapping_error && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {result.mapping_error}
        </p>
      )}
      {content}
      {mapped?.truncated && <p className="text-xs text-muted-foreground">Showing the first 500 items.</p>}
    </div>
  )
}
