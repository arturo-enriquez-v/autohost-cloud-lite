// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { ConnectorParam, ConnectorParamValues } from "@/lib/features/connectors/interfaces/connector"

/** Initial values: each param's default. */
export function defaultParamValues(params: ConnectorParam[]): Record<string, string> {
  return Object.fromEntries(params.map((p) => [p.name, p.default ?? ""]))
}

/** Converts form values to what the API expects, leaving empty optional values out. */
export function toParamValues(params: ConnectorParam[], values: Record<string, string>): ConnectorParamValues {
  const out: ConnectorParamValues = {}
  for (const p of params) {
    const v = values[p.name] ?? ""
    if (v === "") continue
    if (p.type === "number" && !Number.isNaN(Number(v))) out[p.name] = Number(v)
    else if (p.type === "boolean") out[p.name] = v === "true"
    else out[p.name] = v
  }
  return out
}

/** Names of required params without a value. */
export function missingRequired(params: ConnectorParam[], values: Record<string, string>): string[] {
  return params.filter((p) => p.required && !(values[p.name] ?? "").trim()).map((p) => p.label || p.name)
}

export function ParamInputs({
  params,
  values,
  onChange,
  idPrefix,
}: {
  params: ConnectorParam[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
  idPrefix: string
}) {
  if (params.length === 0) return null
  const set = (name: string, v: string) => onChange({ ...values, [name]: v })
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {params.map((p) => {
        const id = `${idPrefix}-${p.name}`
        const label = (
          <Label htmlFor={id} className="text-xs">
            {p.label || p.name}
            {p.required && <span className="text-destructive"> *</span>}
          </Label>
        )
        if (p.type === "boolean") {
          return (
            <div key={p.name} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
              {label}
              <Switch
                id={id}
                checked={values[p.name] === "true"}
                onCheckedChange={(c) => set(p.name, c ? "true" : "false")}
              />
            </div>
          )
        }
        return (
          <div key={p.name} className="space-y-1">
            {label}
            <Input
              id={id}
              type={p.type === "number" ? "number" : p.sensitive ? "password" : "text"}
              value={values[p.name] ?? ""}
              placeholder={p.description || p.default || ""}
              autoComplete="off"
              onChange={(e) => set(p.name, e.target.value)}
            />
          </div>
        )
      })}
    </div>
  )
}
