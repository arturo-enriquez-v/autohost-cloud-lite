"use client"

import type React from "react"
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Server, Lock, Mail } from "lucide-react"

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = data?.error || data?.message || "Invalid credentials"
        setError(msg)
        return
      }

      // Hard redirect para que el middleware reciba las cookies en la primera request
      window.location.replace(searchParams?.get("next") ?? "/")
    } catch {
      setError("Network error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="admin@autohost.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember me
        </label>
        <Link href="#" className="text-primary hover:text-primary/80 transition-colors">
          Forgot password?
        </Link>
      </div>

      {!!error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Signing in...
          </span>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
            <Server className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">AutoHost Cloud Lite</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to manage your servers</p>
        </div>

        {/* Login Form */}
        <div className="rounded-lg border border-border bg-card p-8 shadow-lg">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Create one
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          © AutoHost Cloud Lite 2025 - Secure Server Management
        </p>
      </div>
    </div>
  )
}
