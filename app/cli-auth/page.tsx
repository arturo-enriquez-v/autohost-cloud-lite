import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Terminal } from "lucide-react"
import { AuthorizeButton } from "./AuthorizeButton"

const CLI_PENDING_COOKIE = "_cli_pending"

interface CLIAuthPageProps {
  searchParams: Promise<{ state?: string; callback?: string; node?: string; api_url?: string }>
}

/** Allowed: http:// followed by a private/loopback IP and a port > 1024. */
function isAllowedCallback(raw: string): boolean {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== "http:") return false
  const host = u.hostname
  const port = parseInt(u.port || "80", 10)
  if (port <= 1024 || port > 65535) return false
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  )
}

export default async function CLIAuthPage({ searchParams }: CLIAuthPageProps) {
  const cookieStore = await cookies()
  const rawParams = await searchParams

  // Resolve params: prefer URL query params (first visit from CLI),
  // fall back to the _cli_pending cookie (second visit after login redirect).
  let state = rawParams.state
  let callback = rawParams.callback
  let node = rawParams.node
  let apiUrl = rawParams.api_url

  if (!state || !callback || !node) {
    const pending = cookieStore.get(CLI_PENDING_COOKIE)?.value
    if (pending) {
      try {
        const parsed = JSON.parse(pending)
        state = parsed.state
        callback = parsed.callback
        node = parsed.node
        apiUrl = parsed.apiUrl
      } catch {
        // malformed cookie — fall through to error UI
      }
    }
  }

  if (!state || !callback || !node) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full border border-destructive/40 rounded-xl bg-card p-8 text-center space-y-2">
          <h1 className="text-lg font-semibold text-foreground">Parámetros inválidos</h1>
          <p className="text-sm text-muted-foreground">
            Por favor, ejecuta <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">autohost up</code> de nuevo.
          </p>
        </div>
      </div>
    )
  }

  if (!isAllowedCallback(callback)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full border border-destructive/40 rounded-xl bg-card p-8 text-center space-y-2">
          <h1 className="text-lg font-semibold text-foreground">Callback inválido</h1>
          <p className="text-sm text-muted-foreground">La URL de callback debe ser una dirección IP privada o loopback.</p>
        </div>
      </div>
    )
  }

  // Server-side auth check.
  // If not authenticated, store params in a cookie via the auth-init route
  // (avoids URL encoding issues with complex params through login redirect).
  const accessToken = cookieStore.get("access_token")?.value

  if (!accessToken) {
    const initURL = `/api/cli/auth-init?state=${encodeURIComponent(state)}&callback=${encodeURIComponent(callback)}&node=${encodeURIComponent(node)}${apiUrl ? `&api_url=${encodeURIComponent(apiUrl)}` : ""}`
    redirect(initURL)
  }

  const nodeName = decodeURIComponent(node)


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full border border-border rounded-xl bg-card p-8 space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Terminal className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Autorizar CLI</h1>
          <p className="text-sm text-muted-foreground">
            El comando <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">autohost up</code> está
            solicitando conectar el siguiente nodo:
          </p>
          <div className="mt-3 font-mono text-sm font-medium text-foreground bg-muted px-4 py-2 rounded-md border border-border">
            {nodeName}
          </div>
        </div>

        {/* Action */}
        <AuthorizeButton state={state} callback={callback} node={node} apiUrl={apiUrl} />

        <p className="text-center text-xs text-muted-foreground">
          Solo autoriza si <span className="text-foreground font-medium">tú</span> ejecutaste{" "}
          <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">autohost up</code> en ese nodo.
        </p>
      </div>
    </div>
  )
}
