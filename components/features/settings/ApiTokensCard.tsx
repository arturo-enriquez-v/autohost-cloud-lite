// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AlertCircle, KeyRound, Loader2, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useApiTokens } from "@/lib/features/api-tokens/hooks/useApiTokens"
import type { ApiToken } from "@/lib/features/api-tokens/interfaces/api-token"
import { CreateApiTokenDialog } from "./CreateApiTokenDialog"

const SCOPE_LABELS: Record<string, { label: string; className: string }> = {
  read: { label: "Read only", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  custom: { label: "Custom", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  write: { label: "Full access", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
}

function formatDate(iso?: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function tokenStatus(t: ApiToken): "active" | "expired" | "revoked" {
  if (t.revoked_at) return "revoked"
  if (new Date(t.expires_at).getTime() <= Date.now()) return "expired"
  return "active"
}

/**
 * Permissions of a custom token without the reads the API adds implicitly: a module's ":read" is hidden
 * when the module has a stronger permission, and node:read when there is anything else.
 */
function customPermissionSummary(perms: string[] = []) {
  const moduleOf = (p: string) => p.split(":")[0]
  const strongerModules = new Set(perms.filter((p) => !p.endsWith(":read")).map(moduleOf))
  const summary = perms.filter((p) => {
    if (p === "node:read") return false
    return !(p.endsWith(":read") && strongerModules.has(moduleOf(p)))
  })
  return summary.length > 0 ? summary : perms
}

export function ApiTokensCard() {
  const { tokens, isLoading, error, create, revoke } = useApiTokens()
  const [createOpen, setCreateOpen] = useState(false)
  const [toRevoke, setToRevoke] = useState<ApiToken | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)

  const handleRevoke = async () => {
    if (!toRevoke) return
    setRevoking(true)
    const res = await revoke(toRevoke.id)
    setRevoking(false)
    if (res.success) {
      setToRevoke(null)
      setRevokeError(null)
    } else {
      setRevokeError(res.error)
      setToRevoke(null)
    }
  }

  const sorted = [...tokens].sort((a, b) => {
    const rank = { active: 0, expired: 1, revoked: 2 }
    return rank[tokenStatus(a)] - rank[tokenStatus(b)]
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            API Tokens
          </CardTitle>
          <CardDescription>
            Personal tokens for scripts and MCP clients such as Claude. Each one acts as you, limited by its access.
          </CardDescription>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New token
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {(error || revokeError) && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{revokeError ?? error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <KeyRound className="mb-2 h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">No API tokens yet</p>
            <p className="mb-4 mt-1 max-w-sm text-xs text-muted-foreground">
              Create one to let a script or an AI agent use the AutoHost API without your password.
            </p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create your first token
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            {sorted.map((t) => {
              const status = tokenStatus(t)
              const scope = SCOPE_LABELS[t.scope] ?? { label: t.scope, className: "bg-muted text-muted-foreground" }
              const perms = t.scope === "custom" ? customPermissionSummary(t.permissions) : []
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex flex-col justify-between gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center",
                    status !== "active" && "opacity-60"
                  )}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{t.name}</span>
                      <Badge variant="outline" className={cn("border-transparent", scope.className)}>
                        {scope.label}
                      </Badge>
                      {status === "revoked" && <Badge variant="secondary">Revoked</Badge>}
                      {status === "expired" && <Badge variant="secondary">Expired</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-mono">{t.token_prefix}…</span>
                      <span>Created {formatDate(t.created_at)}</span>
                      {status === "active" && <span>Expires {formatDate(t.expires_at)}</span>}
                      <span>{t.last_used_at ? `Last used ${formatDate(t.last_used_at)}` : "Never used"}</span>
                    </div>
                    {perms.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {perms.map((p) => (
                          <span key={p} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 self-end text-muted-foreground hover:text-destructive sm:self-center"
                      onClick={() => setToRevoke(t)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Revoke
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <CreateApiTokenDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={create} />

      <ConfirmDialog
        open={toRevoke !== null}
        onOpenChange={(open) => !open && setToRevoke(null)}
        title="Revoke API token?"
        description={`"${toRevoke?.name ?? ""}" will stop working immediately. Anything using it (scripts, MCP clients) will lose access.`}
        confirmLabel="Revoke"
        loading={revoking}
        onConfirm={handleRevoke}
      />
    </Card>
  )
}
