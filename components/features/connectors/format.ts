// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

/** Text for a value picked out of a JSON response. */
export function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

export function formatJSON(v: unknown): string {
  if (typeof v === "string") return v
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}
