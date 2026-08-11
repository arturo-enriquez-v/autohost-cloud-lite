"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Copy, Check, Shield, Loader2, AlertCircle, Terminal, Key } from "lucide-react"

interface VPNKeyData {
  login_server: string
  preauth_key: string
  user: string
  command: string
}

export function HeadscaleCard() {
  const [vpnData, setVpnData] = useState<VPNKeyData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState(false)

  const generateVPNKey = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/vpn/key", {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Error al generar la key de VPN" }))
        throw new Error(data.error || "Error al generar la key de VPN")
      }

      const data: VPNKeyData = await res.json()
      setVpnData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const copyKey = async () => {
    if (vpnData?.preauth_key) {
      await navigator.clipboard.writeText(vpnData.preauth_key)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const copyCommand = async () => {
    if (vpnData?.command) {
      await navigator.clipboard.writeText(vpnData.command)
      setCopiedCmd(true)
      setTimeout(() => setCopiedCmd(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Red Privada Headscale (VPN)
        </CardTitle>
        <CardDescription>
          Genera llaves de pre-autenticación para conectar tus VPS y clientes a tu red privada Mesh.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {vpnData ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Usuario Headscale</Label>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono font-medium">
                  {vpnData.user}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Login Server</Label>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono text-muted-foreground">
                  {vpnData.login_server}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vpn-preauth-key">Pre-Auth Key</Label>
              <div className="flex gap-2">
                <Input
                  id="vpn-preauth-key"
                  type="text"
                  value={vpnData.preauth_key}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyKey}
                  title="Copiar Key"
                >
                  {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Esta llave expira en 30 días y puede reutilizarse para unir múltiples nodos de tu cuenta.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" />
                Comando para conectar nodo
              </Label>
              <div className="flex items-center justify-between rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100 border border-zinc-800">
                <span className="truncate pr-2">{vpnData.command}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyCommand}
                  className="h-7 text-zinc-400 hover:text-white shrink-0"
                >
                  {copiedCmd ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Check className="h-3.5 w-3.5" /> Copiado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </span>
                  )}
                </Button>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={generateVPNKey} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
              Generar nueva Pre-Auth Key
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Obtén una llave de autenticación previa para unir tus servidores o tu terminal a la VPN de AutoHost mediante <code>autohost vpn connect</code>.
            </p>
            <Button onClick={generateVPNKey} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando Key...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" /> Generar Key de VPN (Headscale)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
