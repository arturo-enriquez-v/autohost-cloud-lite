"use client"

import { AlertTriangle, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PermissionModuleGroup } from "@/lib/features/users/interfaces/user"

interface PermissionMatrixProps {
  modules: PermissionModuleGroup[]
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}

/**
 * Granular permission grid grouped by module. Selecting any write/manage
 * permission automatically selects the module's read permission (and
 * node:read), mirroring the backend's implied-read semantics.
 */
export function PermissionMatrix({ modules, value, onChange, disabled }: PermissionMatrixProps) {
  const selected = new Set(value.includes("*") ? modules.flatMap((m) => m.permissions.map((p) => p.key)) : value)

  const toggle = (key: string) => {
    const next = new Set(selected)
    const [module, action] = key.split(":")
    if (next.has(key)) {
      next.delete(key)
      // Removing a read permission removes every permission of that module.
      if (action === "read") {
        for (const k of Array.from(next)) if (k.startsWith(`${module}:`)) next.delete(k)
        if (module === "node") next.clear()
      }
    } else {
      next.add(key)
      next.add(`${module}:read`)
      next.add("node:read")
    }
    onChange(Array.from(next))
  }

  const toggleModule = (mod: PermissionModuleGroup) => {
    const keys = mod.permissions.map((p) => p.key)
    const allOn = keys.every((k) => selected.has(k))
    const next = new Set(selected)
    if (allOn) {
      keys.forEach((k) => next.delete(k))
      if (mod.module === "node") next.clear()
    } else {
      keys.forEach((k) => next.add(k))
      next.add("node:read")
    }
    onChange(Array.from(next))
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {modules.map((mod) => {
        const keys = mod.permissions.map((p) => p.key)
        const count = keys.filter((k) => selected.has(k)).length
        return (
          <div key={mod.module} className="rounded-lg border border-border bg-muted/20 p-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggleModule(mod)}
              className="flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed"
              title={mod.description}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground/80">{mod.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  count === keys.length
                    ? "bg-[#70AEFF]/20 text-[#70AEFF]"
                    : count > 0
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}/{keys.length}
              </span>
            </button>
            <div className="mt-2 space-y-1">
              {mod.permissions.map((perm) => {
                const on = selected.has(perm.key)
                return (
                  <label
                    key={perm.key}
                    title={perm.description}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-[#70AEFF]/10",
                      disabled && "cursor-not-allowed opacity-60 hover:bg-transparent"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        on ? "border-[#70AEFF] bg-[#70AEFF] text-black" : "border-muted-foreground/40"
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      disabled={disabled}
                      onChange={() => toggle(perm.key)}
                    />
                    <span className="flex-1 leading-tight">
                      <span className="flex items-center gap-1">
                        {perm.label}
                        {perm.danger && <AlertTriangle className="h-3 w-3 text-rose-400" />}
                      </span>
                      <span className="block font-mono text-[10px] text-muted-foreground">{perm.key}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
