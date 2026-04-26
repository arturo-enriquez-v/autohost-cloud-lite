"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, AlertTriangle, Check, CheckCircle2, Globe, Loader2, Plus, RefreshCw, Trash2, XCircle } from "lucide-react"
import { useNode } from "@/lib/hooks/useNode"
import { useCaddyRoutes } from "@/lib/hooks/useCaddyRoutes"
import { useCaddyStatus } from "@/lib/hooks/useCaddyStatus"

export default function NodeProxyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()

  const { node, isLoading: nodeLoading } = useNode(nodeId)
  const { routes, isLoading, upsert, remove } = useCaddyRoutes(nodeId)
  const { status: caddyStatus, check: checkCaddy } = useCaddyStatus(nodeId)

  // Check Caddy status on mount
  useEffect(() => {
    checkCaddy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId])

  const formDisabled = caddyStatus !== "running"

  const [form, setForm] = useState({ domain: "", upstream: "" })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleUpsert = async () => {
    if (!form.domain.trim() || !form.upstream.trim()) {
      setError("Domain and upstream are required")
      return
    }
    try {
      setSaving(true)
      setError(null)
      await upsert(form.domain.trim(), form.upstream.trim())
      setForm({ domain: "", upstream: "" })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save route")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (domain: string) => {
    try {
      setDeleting(domain)
      await remove(domain)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/node/${nodeId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Reverse Proxy
          </h2>
          <p className="text-sm text-muted-foreground">
            {nodeLoading ? "Loading…" : node?.name ?? nodeId}
          </p>
        </div>
      </div>

      {/* Caddy status banner */}
      {caddyStatus === "checking" && (
        <div className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          Checking Caddy status on this node…
        </div>
      )}
      {caddyStatus === "running" && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Caddy is running on this node. You can manage routes below.
        </div>
      )}
      {caddyStatus === "stopped" && (
        <div className="flex items-center justify-between gap-4 flex-wrap rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center gap-3">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>
              Caddy is <strong>not running</strong> on this node. Install and start Caddy with admin API enabled
              (<code className="font-mono text-xs">admin localhost:2019</code> in Caddyfile) before adding routes.
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={checkCaddy} className="gap-2 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
            Check again
          </Button>
        </div>
      )}
      {caddyStatus === "unknown" && (
        <div className="flex items-center justify-between gap-4 flex-wrap rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Could not determine Caddy status. The node may be offline or the agent is not responding.</span>
          </div>
          <Button size="sm" variant="outline" onClick={checkCaddy} className="gap-2 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Caddy Routes</CardTitle>
          <CardDescription>
            Manage domain → upstream routes via the Caddy admin API on this node (localhost:2019).
            Caddy handles TLS automatically via ACME.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Routes list */}
              {routes.length > 0 ? (
                <div className="rounded-lg border divide-y">
                  {routes.map((route) => (
                    <div key={route.id} className="flex items-center justify-between px-4 py-3 gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{route.domain}</p>
                        <p className="text-xs text-muted-foreground truncate">→ {route.upstream}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={deleting === route.domain || formDisabled}
                        onClick={() => handleDelete(route.domain)}
                      >
                        {deleting === route.domain ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-lg border border-dashed text-muted-foreground">
                  <Globe className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No routes configured yet</p>
                </div>
              )}

              {/* Add route form */}
              <div>
                <p className="text-sm font-medium mb-3">Add route</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-1">
                    <Label htmlFor="proxy-domain">Domain</Label>
                    <Input
                      id="proxy-domain"
                      placeholder="app.example.com"
                      value={form.domain}
                      disabled={formDisabled}
                      onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && !formDisabled && handleUpsert()}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="proxy-upstream">Upstream</Label>
                    <Input
                      id="proxy-upstream"
                      placeholder="localhost:3000"
                      value={form.upstream}
                      disabled={formDisabled}
                      onChange={(e) => setForm((f) => ({ ...f, upstream: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && !formDisabled && handleUpsert()}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleUpsert} disabled={saving || formDisabled} className="gap-2 w-full sm:w-auto">
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : saved ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {saving ? "Saving…" : saved ? "Saved!" : "Add Route"}
                    </Button>
                  </div>
                </div>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

