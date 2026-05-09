"use client"

import { useState } from "react"
import { Check, Globe, Loader2, Lock, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { LiveCaddyRoute } from "@/lib/types/caddy-route"
import { CaddyStatusState } from "@/lib/features/nodes/caddy/hooks/useCaddyStatus"
import { useCaddyRoutes } from "@/lib/features/nodes/caddy/hooks/useCaddyRoutes"

interface CaddyRoutesCardProps {
  nodeId: string
  caddyStatus: CaddyStatusState
  liveRoutes: LiveCaddyRoute[]
}

export function CaddyRoutesCard({ nodeId, caddyStatus, liveRoutes }: CaddyRoutesCardProps) {
  const { routes, isLoading, upsert, remove } = useCaddyRoutes(nodeId)

  const formDisabled = caddyStatus !== "running"
  const externalRoutes = liveRoutes.filter((r) => !r.managed)

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
      setSaving(true); setError(null)
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
            {/* External routes (read-only, from Caddyfile) */}
            {externalRoutes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  External routes (Caddyfile)
                </p>
                <div className="rounded-lg border border-dashed divide-y opacity-80">
                  {externalRoutes.map((route) => (
                    <div key={route.domain} className="flex items-center px-4 py-3 gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{route.domain}</p>
                        <p className="text-xs text-muted-foreground truncate">→ {route.upstream}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">read-only</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Managed routes */}
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
  )
}
