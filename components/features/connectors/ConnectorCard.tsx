// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useMemo, useState } from "react"
import { History, KeyRound, Loader2, Pencil, Play, RefreshCw, Trash2, Zap, BarChart3 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConnectorRun } from "@/lib/features/connectors/hooks/useConnectorRun"
import {
  canManageConnector,
  isDestructiveMethod,
  type Connector,
} from "@/lib/features/connectors/interfaces/connector"
import { ConnectorResultView } from "./ConnectorResultView"
import { ConnectorRunsDialog } from "./ConnectorRunsDialog"
import { defaultParamValues, missingRequired, ParamInputs, toParamValues } from "./ParamInputs"

interface ConnectorCardProps {
  connector: Connector
  projectName?: string
  onEdit: (c: Connector) => void
  onDelete: (c: Connector) => void
}

/**
 * A connector on the panel. Query connectors work as widgets: they load on their own when no value is
 * required and can be refreshed. Action connectors run on demand, with a confirmation for methods that
 * change data.
 */
export function ConnectorCard({ connector, projectName, onEdit, onDelete }: ConnectorCardProps) {
  const isQuery = connector.kind === "query"
  const [values, setValues] = useState(() => defaultParamValues(connector.params))
  const missing = missingRequired(connector.params, values)
  const autoRun = isQuery && missingRequired(connector.params, defaultParamValues(connector.params)).length === 0
  const { result, error, isRunning, run } = useConnectorRun(connector, { auto: autoRun })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [runsOpen, setRunsOpen] = useState(false)
  const manage = canManageConnector(connector)
  const noCredentials = connector.auth.type !== "none" && !connector.has_secret

  const paramSummary = useMemo(
    () =>
      Object.entries(toParamValues(connector.params, values))
        .map(([k, v]) => {
          const p = connector.params.find((x) => x.name === k)
          return `${p?.label || k}: ${p?.sensitive ? "***" : v}`
        })
        .join(", "),
    [connector.params, values]
  )

  const execute = async () => {
    const res = await run(toParamValues(connector.params, values))
    if (!isQuery && res) {
      if (res.ok) toast.success(`${connector.name}: HTTP ${res.status_code}`)
      else toast.error(`${connector.name}: HTTP ${res.status_code}`)
    }
  }

  const onRunClick = () => {
    if (!isQuery && isDestructiveMethod(connector.method)) setConfirmOpen(true)
    else execute()
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {isQuery ? (
                <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Zap className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{connector.name}</span>
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-mono text-[10px]">
                {connector.method}
              </Badge>
              <span>{isQuery ? "Query" : "Action"}</span>
              {projectName && <span>· {projectName}</span>}
              {connector.auth.type !== "none" && (
                <span className="inline-flex items-center gap-0.5" title={`Auth: ${connector.auth.type}`}>
                  · <KeyRound className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            {isQuery && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Refresh"
                disabled={isRunning || missing.length > 0}
                onClick={execute}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? "animate-spin" : ""}`} />
              </Button>
            )}
            {!isQuery && (
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Run history" onClick={() => setRunsOpen(true)}>
                <History className="h-3.5 w-3.5" />
              </Button>
            )}
            {manage && (
              <>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => onEdit(connector)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 hover:text-destructive"
                  title="Delete"
                  onClick={() => onDelete(connector)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
        {connector.description && <p className="text-sm text-muted-foreground">{connector.description}</p>}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {noCredentials && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No credentials set{manage ? ": edit the connector to add them." : "."}
          </p>
        )}

        <ParamInputs params={connector.params} values={values} onChange={setValues} idPrefix={connector.id} />

        {(!isQuery || connector.params.length > 0) && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onRunClick} disabled={isRunning || missing.length > 0}>
              {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {isQuery ? "Load" : "Run"}
            </Button>
            {missing.length > 0 && <span className="text-xs text-muted-foreground">Required: {missing.join(", ")}</span>}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {isRunning && !result && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {result && <ConnectorResultView result={result} view={connector.response.view} />}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Run "${connector.name}"?`}
        description={`This sends a ${connector.method} request${
          connector.auth.type !== "none" ? " with the connector's stored credentials" : ""
        }${paramSummary ? ` (${paramSummary})` : ""}. It may change data in the external service.`}
        confirmLabel="Run"
        destructive={connector.method === "DELETE"}
        loading={isRunning}
        onConfirm={async () => {
          await execute()
          setConfirmOpen(false)
        }}
      />
      {!isQuery && <ConnectorRunsDialog connector={connector} open={runsOpen} onOpenChange={setRunsOpen} />}
    </Card>
  )
}
