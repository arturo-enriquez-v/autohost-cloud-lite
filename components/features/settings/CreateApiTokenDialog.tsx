// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, AlertTriangle, Check, Copy, Eye, KeyRound, Loader2, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { PermissionMatrix } from "@/components/features/users/PermissionMatrix"
import { usePermissionsCatalog } from "@/lib/features/users/hooks/useUsers"
import type {
  ApiTokenScope,
  CreateApiTokenInput,
  CreatedApiToken,
} from "@/lib/features/api-tokens/interfaces/api-token"

const EXPIRY_OPTIONS = [7, 30, 90, 180, 365]

const SCOPES: { id: ApiTokenScope; label: string; description: string; icon: typeof Eye }[] = [
  {
    id: "read",
    label: "Read only",
    description: "View nodes, metrics, containers, logs and files. Cannot change anything.",
    icon: Eye,
  },
  {
    id: "custom",
    label: "Custom",
    description: "Pick node permissions. Can only make changes on nodes, never on your account or the platform.",
    icon: SlidersHorizontal,
  },
  {
    id: "write",
    label: "Full access",
    description: "Everything you can do, including running commands on nodes and deleting resources.",
    icon: ShieldCheck,
  },
]

interface CreateApiTokenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: CreateApiTokenInput) => Promise<{ success: true; data: CreatedApiToken } | { success: false; error: string }>
}

export function CreateApiTokenDialog({ open, onOpenChange, onCreate }: CreateApiTokenDialogProps) {
  const { catalog, isLoading: catalogLoading, error: catalogError } = usePermissionsCatalog()
  const [name, setName] = useState("")
  const [scope, setScope] = useState<ApiTokenScope>("read")
  const [permissions, setPermissions] = useState<string[]>([])
  const [expiresInDays, setExpiresInDays] = useState(90)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The raw token lives only here, while the dialog is open, and is cleared on close.
  const [rawToken, setRawToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setName("")
    setScope("read")
    setPermissions([])
    setExpiresInDays(90)
    setSaving(false)
    setError(null)
    setRawToken(null)
    setCopied(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const customInvalid = scope === "custom" && permissions.length === 0
  const canSubmit = name.trim() !== "" && !customInvalid && !saving

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    const res = await onCreate({
      name: name.trim(),
      scope,
      expires_in_days: expiresInDays,
      ...(scope === "custom" ? { permissions } : {}),
    })
    setSaving(false)
    if (res.success) {
      setRawToken(res.data.token)
    } else {
      setError(res.error)
    }
  }

  const copyToken = async () => {
    if (!rawToken) return
    await navigator.clipboard.writeText(rawToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        // Once the token is shown, only "Done" closes the dialog, so it is not lost by a stray click.
        onInteractOutside={(e) => rawToken && e.preventDefault()}
        onEscapeKeyDown={(e) => rawToken && e.preventDefault()}
      >
        {rawToken ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Token created
              </DialogTitle>
              <DialogDescription>
                Copy it now. For your security it will not be shown again.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input readOnly value={rawToken} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
                <Button type="button" variant="outline" size="icon" onClick={copyToken} aria-label="Copy token">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-xs">
                <p className="font-medium text-foreground">Use it as a bearer token:</p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-muted-foreground">
                  Authorization: Bearer {rawToken.slice(0, 12)}…
                </pre>
                <p className="text-muted-foreground">
                  For an MCP client, add that header to the server configuration. Anyone with this token can act
                  as you within its scope: store it like a password and revoke it when you no longer need it.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                New API token
              </DialogTitle>
              <DialogDescription>
                A personal token for scripts and MCP clients. It acts as you, limited by the access you choose here.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <Label htmlFor="api-token-name">Name</Label>
                <Input
                  id="api-token-name"
                  placeholder="Claude MCP"
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-token-expiry">Expires in</Label>
                <Select value={String(expiresInDays)} onValueChange={(v) => setExpiresInDays(Number(v))}>
                  <SelectTrigger id="api-token-expiry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} days
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Access</Label>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                {SCOPES.map((s) => {
                  const Icon = s.icon
                  const active = scope === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setScope(s.id)}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                        active ? "border-primary bg-primary/10" : "hover:bg-accent/40"
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <Icon className="h-4 w-4" />
                        {s.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {scope === "write" && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  A full access token can run commands on your nodes and delete anything you can. Prefer Read only or
                  Custom for AI agents.
                </span>
              </div>
            )}

            {scope === "custom" && (
              <div className="space-y-2">
                <Label>Node permissions</Label>
                <p className="text-xs text-muted-foreground">
                  The token gets these permissions only on nodes where you have them too.
                </p>
                {catalogLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : catalogError || !catalog ? (
                  <p className="text-sm text-destructive">{catalogError ?? "Could not load the permission catalog"}</p>
                ) : (
                  <PermissionMatrix modules={catalog.modules} value={permissions} onChange={setPermissions} disabled={saving} />
                )}
                {customInvalid && <p className="text-xs text-muted-foreground">Select at least one permission.</p>}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create token
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
