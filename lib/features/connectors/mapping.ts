// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

// Client copy of the API's response mapping (autohost-cloud-api internal/core/connectors/mapping.go), used
// for the live preview while editing. The API's result is the source of truth when running.

import type { ConnectorMapped, ConnectorResponseMapping } from "./interfaces/connector"

const MAX_ROWS = 500

type Step = { kind: "key"; key: string } | { kind: "index"; index: number } | { kind: "all" }

/** Parses "data.items[].name", "results[0].id", "[0]". Throws on invalid syntax. */
export function parsePath(p: string): Step[] {
  if (!p) throw new Error("empty path")
  const steps: Step[] = []
  let i = 0
  while (i < p.length) {
    const c = p[i]
    if (c === ".") {
      if (i === 0 || i === p.length - 1 || p[i + 1] === "." || p[i + 1] === "[") throw new Error(`unexpected '.' in ${p}`)
      i++
    } else if (c === "[") {
      const end = p.indexOf("]", i)
      if (end < 0) throw new Error(`missing ']' in ${p}`)
      const inner = p.slice(i + 1, end)
      if (inner === "") steps.push({ kind: "all" })
      else if (/^-?\d+$/.test(inner)) steps.push({ kind: "index", index: Number(inner) })
      else throw new Error(`index ${inner} is not a number`)
      i = end + 1
      if (i < p.length && p[i] !== "." && p[i] !== "[") throw new Error(`unexpected '${p[i]}' after ']'`)
    } else {
      let j = i
      while (j < p.length && p[j] !== "." && p[j] !== "[") {
        if (p[j] === "]") throw new Error(`unexpected ']' in ${p}`)
        j++
      }
      steps.push({ kind: "key", key: p.slice(i, j) })
      i = j
    }
  }
  return steps
}

export function extract(v: unknown, steps: Step[]): unknown {
  for (let n = 0; n < steps.length; n++) {
    const s = steps[n]
    if (s.kind === "key") {
      if (!v || typeof v !== "object" || Array.isArray(v)) return null
      v = (v as Record<string, unknown>)[s.key]
    } else if (s.kind === "index") {
      if (!Array.isArray(v)) return null
      const idx = s.index < 0 ? s.index + v.length : s.index
      if (idx < 0 || idx >= v.length) return null
      v = v[idx]
    } else {
      if (!Array.isArray(v)) return null
      const rest = steps.slice(n + 1)
      return v.map((item) => extract(item, rest))
    }
  }
  return v === undefined ? null : v
}

/** Same rules as the API: root selects the items, each field a column; no fields = one "value" column. */
export function applyMapping(body: unknown, m: ConnectorResponseMapping): ConnectorMapped | null {
  const fields = m.fields ?? []
  if (!m.root && fields.length === 0) return null
  const root = m.root ? extract(body, parsePath(m.root)) : body
  let items = Array.isArray(root) ? root : [root]
  const truncated = items.length > MAX_ROWS
  if (truncated) items = items.slice(0, MAX_ROWS)
  if (fields.length === 0) {
    return { columns: ["value"], rows: items.map((it) => [it]), truncated }
  }
  const paths = fields.map((f) => parsePath(f.path))
  return {
    columns: fields.map((f) => f.label),
    rows: items.map((it) => paths.map((p) => extract(it, p))),
    truncated,
  }
}

/** Whether a JSON key can be written in a path (no separators). */
export function isPathSafeKey(k: string): boolean {
  return k !== "" && !/[.[\]]/.test(k)
}

export function childPath(parent: string, key: string | number): string {
  if (typeof key === "number") return `${parent}[${key}]`
  return parent ? `${parent}.${key}` : key
}

/**
 * Turns an absolute path into one relative to the items selected by root, or null when the value is
 * outside them. Example: root "data.items", path "data.items[0].user.name" → "user.name".
 */
export function relativeToRoot(root: string, path: string, rootIsList: boolean): string | null {
  if (rootIsList) {
    if (!path.startsWith(root + "[")) return null
    const rest = path.slice(root.length).replace(/^\[-?\d+\]\.?/, "")
    return rest === path.slice(root.length) || rest === "" ? null : rest
  }
  if (root === "") return path
  if (!path.startsWith(root + ".") && !path.startsWith(root + "[")) return null
  return path.slice(root.length).replace(/^\./, "")
}

/** {{name}} placeholders used in a text. */
export function placeholdersIn(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g)) out.add(m[1])
  return [...out]
}
