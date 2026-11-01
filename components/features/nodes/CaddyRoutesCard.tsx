"use client"

import { useState } from "react"
import { Check, Globe, Loader2, Lock, Plus, ShieldCheck, Trash2, Unlock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { CaddyTLSMode, LiveCaddyRoute } from "@/lib/types/caddy-route"
import { CaddyStatusState } from "@/lib/features/nodes/caddy/hooks/useCaddyStatus"
import { useCaddyRoutes } from "@/lib/features/nodes/caddy/hooks/useCaddyRoutes"

interface CaddyRoutesCardProps {
  nodeId: string
  caddyStatus: CaddyStatusState
  liveRoutes: LiveCaddyRoute[]
}

const TLS_MODE_LABELS: Record<CaddyTLSMode, string> = {
  auto: "Auto (ACME / .local / Tailscale)",
  internal: "TLS Interno (CA Local / CGNAT)",
  http_only: "Solo HTTP (Sin SSL / LAN)",
}

export function CaddyRoutesCard({ nodeId, caddyStatus, liveRoutes }: CaddyRoutesCardProps) {
  const { routes, isLoading, upsert, remove } = useCaddyRoutes(nodeId)

  const formDisabled = caddyStatus !== "running"
  const externalRoutes = liveRoutes.filter((r) => !r.managed)

  const [form, setForm] = useState<{ domain: string; upstream: string; tlsMode: CaddyTLSMode }>({
    domain: "",
    upstream: "",
    tlsMode: "auto",
  })
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
      await upsert(form.domain.trim(), form.upstream.trim(), form.tlsMode)
      setForm({ domain: "", upstream: "", tlsMode: "auto" })
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
        <CardTitle>Caddy Routes & Homelab Ingress</CardTitle>
        <CardDescription>
          Configura rutas inversas en Caddy (localhost:2019). Soporta dominios públicos (ACME),
          dominios locales (<code>.local</code>, <code>.lan</code>, <code>.home.arpa</code>),
          Tailscale MagicDNS (<code>*.ts.net</code>) o acceso directo por HTTP en LAN.
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
                {routes.map((route) => {
                  const mode = route.tlsMode ?? "auto"
                  return (
                    <div key={route.id} className="flex items-center justify-between px-4 py-3 gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{route.domain}</p>
                          <Badge variant={mode === "http_only" ? "secondary" : "outline"} className="text-[11px] gap-1">
                            {mode === "http_only" ? (
                              <Unlock className="h-3 w-3" />
                            ) : (
                              <ShieldCheck className="h-3 w-3" />
                            )}
                            {mode === "internal" ? "TLS Interno" : mode === "http_only" ? "HTTP" : "Auto TLS"}
                          </Badge>
                        </div>
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
                  )
                })}
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
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <div className="space-y-1">
                  <Label htmlFor="proxy-domain">Domain / Host</Label>
                  <Input
                    id="proxy-domain"
                    placeholder="jellyfin.local, nodo.ts.net o app.com"
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
                    placeholder="localhost:8096"
                    value={form.upstream}
                    disabled={formDisabled}
                    onChange={(e) => setForm((f) => ({ ...f, upstream: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && !formDisabled && handleUpsert()}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="proxy-tls-mode">TLS / SSL Mode</Label>
                  <select
                    id="proxy-tls-mode"
                    value={form.tlsMode}
                    disabled={formDisabled}
                    onChange={(e) => setForm((f) => ({ ...f, tlsMode: e.target.value as CaddyTLSMode }))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {(Object.keys(TLS_MODE_LABELS) as CaddyTLSMode[]).map((mode) => (
                      <option key={mode} value={mode} className="bg-background text-foreground">
                        {TLS_MODE_LABELS[mode]}
                      </option>
                    ))}
                  </select>
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
