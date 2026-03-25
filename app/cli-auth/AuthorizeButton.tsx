"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, ShieldCheck } from "lucide-react"

interface AuthorizeButtonProps {
  state: string
  callback: string
  node: string
  apiUrl?: string
}

export function AuthorizeButton({ state, callback, node, apiUrl }: AuthorizeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState(false)

  const handleAuthorize = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/cli/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_url: apiUrl }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Error al generar el token de autorización.")
        return
      }

      const { token, api_url } = await res.json()
      setAuthorized(true)

      // Redirect the browser to the CLI's local callback server.
      // `callback` is validated server-side to be a private/loopback URL.
      const callbackURL = new URL(`${callback}/callback`)
      callbackURL.searchParams.set("token", token)
      callbackURL.searchParams.set("api_url", api_url)
      callbackURL.searchParams.set("state", state)
      callbackURL.searchParams.set("node", node)

      window.location.href = callbackURL.toString()
    } catch {
      setError("Error de red. Asegúrate de que el proceso autohost up siga activo.")
    } finally {
      setLoading(false)
    }
  }

  if (authorized) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-primary py-2">
        <ShieldCheck className="h-4 w-4" />
        <span>Redirigiendo a la terminal...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2">
          {error}
        </div>
      )}
      <Button onClick={handleAuthorize} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Autorizando...
          </>
        ) : (
          "Autorizar conexión"
        )}
      </Button>
    </div>
  )
}
