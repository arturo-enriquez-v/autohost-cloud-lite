// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

// Paths inside a node's shared folder: "/" is its root, no trailing slash otherwise.

/** "/a/b" → "/a", "/a" → "/". */
export function parentDir(path: string): string {
  const parts = path.split("/").filter(Boolean)
  parts.pop()
  return parts.length ? "/" + parts.join("/") : "/"
}

export function joinPath(dir: string, name: string): string {
  return dir === "/" ? `/${name}` : `${dir}/${name}`
}

/**
 * Whether an item can be moved into targetDir: not where it already is, not onto itself and, for a folder,
 * not inside its own tree.
 */
export function canMoveInto(item: { path: string; is_dir: boolean }, targetDir: string): boolean {
  if (targetDir === parentDir(item.path) || targetDir === item.path) return false
  if (item.is_dir && targetDir.startsWith(item.path + "/")) return false
  return true
}
