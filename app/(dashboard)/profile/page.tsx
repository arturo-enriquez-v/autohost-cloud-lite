"use client"

import { useProfile } from "@/lib/features/auth/hooks/useProfile"
import { User, Mail, Hash, AlertCircle } from "lucide-react"

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
}

function Field({
  icon,
  label,
  value,
  mono,
  isLoading,
  skeletonWidth,
}: {
  icon: React.ReactNode
  label: string
  value?: React.ReactNode
  mono?: boolean
  isLoading: boolean
  skeletonWidth: string
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:gap-0">
      <div className="flex w-40 shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex-1">
        {isLoading ? (
          <Skeleton className={`h-4 ${skeletonWidth}`} />
        ) : (
          <span className={mono ? "font-mono text-xs text-muted-foreground" : "text-sm text-foreground"}>
            {value}
          </span>
        )}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, isLoading, error } = useProfile()

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?"

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Hero */}
      <div className="flex items-center gap-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary ring-2 ring-primary/20">
          {isLoading ? <User className="h-8 w-8 opacity-40" /> : initials}
        </div>
        <div className="space-y-1">
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-4 w-52" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">
                {user?.name || user?.email?.split("@")[0]}
              </h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <hr className="border-border" />

      {/* Fields */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Account details
        </h2>
        <Field
          icon={<User className="h-3.5 w-3.5" />}
          label="Name"
          value={user?.name ?? <span className="italic text-muted-foreground">Not set</span>}
          isLoading={isLoading}
          skeletonWidth="w-40"
        />
        <Field
          icon={<Mail className="h-3.5 w-3.5" />}
          label="Email"
          value={user?.email}
          isLoading={isLoading}
          skeletonWidth="w-56"
        />
        <Field
          icon={<Hash className="h-3.5 w-3.5" />}
          label="User ID"
          value={user?.uid}
          mono
          isLoading={isLoading}
          skeletonWidth="w-64"
        />
      </section>
    </div>
  )
}
