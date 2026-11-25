// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useState } from "react"
import { ChevronRight, ListTree, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { childPath, isPathSafeKey } from "@/lib/features/connectors/mapping"
import { formatCell } from "./format"

const MAX_ITEMS = 5
const MAX_KEYS = 50

interface PickerProps {
  value: unknown
  /** Use a list (or object) as the response root. */
  onPickRoot: (path: string) => void
  /** Add a value as a column; null when it is outside the current root. */
  onPickField: (path: string, key: string) => void
  /** Whether a value at this absolute path can be added as a field. */
  canPickField: (path: string) => boolean
}

/**
 * Explorable view of a JSON response: lists can be chosen as the item list and values added as columns
 * with one click, so nobody has to write paths by hand.
 */
export function JsonPathPicker(props: PickerProps) {
  return (
    <div className="max-h-80 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs">
      <Node {...props} name="(response)" path="" depth={0} />
    </div>
  )
}

function Node({
  value,
  name,
  path,
  depth,
  onPickRoot,
  onPickField,
  canPickField,
}: PickerProps & { name: string; path: string; depth: number }) {
  const isArray = Array.isArray(value)
  const isObject = !!value && typeof value === "object" && !isArray
  const [open, setOpen] = useState(depth < 2)

  if (!isArray && !isObject) {
    const pickable = path !== "" && canPickField(path)
    return (
      <div className="group flex items-center gap-1.5 py-0.5 pl-4">
        <span className="text-muted-foreground">{name}:</span>
        <span className="truncate text-foreground">{formatCell(value)}</span>
        {pickable && (
          <button
            type="button"
            onClick={() => onPickField(path, name)}
            className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-[#70AEFF] opacity-60 hover:bg-[#70AEFF]/15 group-hover:opacity-100"
            title={`Add ${path} as a column`}
          >
            <Plus className="h-3 w-3" /> column
          </button>
        )}
      </div>
    )
  }

  const entries: [string | number, unknown][] = isArray
    ? (value as unknown[]).slice(0, MAX_ITEMS).map((v, i) => [i, v])
    : Object.entries(value as Record<string, unknown>).slice(0, MAX_KEYS)
  const total = isArray ? (value as unknown[]).length : Object.keys(value as object).length

  return (
    <div>
      <div className="group flex items-center gap-1 py-0.5">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 items-center gap-1">
          <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")} />
          <span className="text-muted-foreground">{name}</span>
          <span className="text-muted-foreground/70">{isArray ? `[${total}]` : `{${total}}`}</span>
        </button>
        {isArray && (
          <button
            type="button"
            onClick={() => onPickRoot(path)}
            className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-[#70AEFF] opacity-60 hover:bg-[#70AEFF]/15 group-hover:opacity-100"
            title="Show one row per item of this list"
          >
            <ListTree className="h-3 w-3" /> use as rows
          </button>
        )}
      </div>
      {open && (
        <div className="ml-2 border-l pl-2">
          {entries.map(([k, v]) => {
            if (typeof k === "string" && !isPathSafeKey(k)) {
              return (
                <div key={k} className="py-0.5 pl-4 text-muted-foreground/60" title="Keys with dots or brackets cannot be used in a path">
                  {k}: …
                </div>
              )
            }
            return (
              <Node
                key={String(k)}
                value={v}
                name={typeof k === "number" ? `[${k}]` : k}
                path={childPath(path, k)}
                depth={depth + 1}
                onPickRoot={onPickRoot}
                onPickField={onPickField}
                canPickField={canPickField}
              />
            )
          })}
          {total > entries.length && (
            <div className="py-0.5 pl-4 text-muted-foreground/60">… {total - entries.length} more</div>
          )}
        </div>
      )}
    </div>
  )
}
