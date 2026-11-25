// Granular node permission keys — kept in sync with
// autohost-cloud-api/internal/core/identity/permissions.go
export const PERMS = {
  NODE_READ: "node:read",
  NODE_UPDATE: "node:update",
  NODE_DELETE: "node:delete",
  METRICS_READ: "metrics:read",
  MONITORS_READ: "monitors:read",
  MONITORS_MANAGE: "monitors:manage",
  CONTAINERS_READ: "containers:read",
  CONTAINERS_ACTION: "containers:action",
  CONTAINERS_DEPLOY: "containers:deploy",
  CONTAINERS_SETTINGS: "containers:settings",
  TERMINAL_EXEC: "terminal:exec",
  FILES_READ: "files:read",
  FILES_WRITE: "files:write",
  FILES_DELETE: "files:delete",
  FILES_SHARE: "files:share",
  JOBS_READ: "jobs:read",
  JOBS_RUN: "jobs:run",
  JOBS_MANAGE: "jobs:manage",
  LOGS_READ: "logs:read",
  LOGS_MANAGE: "logs:manage",
  NETWORK_READ: "network:read",
  NETWORK_MANAGE: "network:manage",
  BACKUPS_READ: "backups:read",
  BACKUPS_CREATE: "backups:create",
  BACKUPS_RESTORE: "backups:restore",
  BACKUPS_MANAGE: "backups:manage",
  VMS_READ: "vms:read",
  VMS_ACTION: "vms:action",
  VMS_MANAGE: "vms:manage",
  ALERTS_READ: "alerts:read",
  ALERTS_MANAGE: "alerts:manage",
  // Project-level: taken from the project membership, not from per-node grants.
  CONNECTORS_READ: "connectors:read",
  CONNECTORS_RUN: "connectors:run",
  CONNECTORS_MANAGE: "connectors:manage",
} as const;

export type Permission = (typeof PERMS)[keyof typeof PERMS];

/**
 * Mirrors identity.HasPermission on the backend:
 *  - "*" grants everything
 *  - any permission of a module implies "<module>:read"
 *  - any permission at all implies "node:read"
 *  - "connectors:manage" also implies "connectors:run"
 */
export function hasPermission(perms: string[] | undefined | null, required: string): boolean {
  if (!perms || perms.length === 0) return false;
  if (perms.includes("*") || perms.includes(required)) return true;
  if (required === PERMS.CONNECTORS_RUN && perms.includes(PERMS.CONNECTORS_MANAGE)) return true;

  const [module, action] = required.split(":");
  if (action === "read") {
    if (module === "node") return true;
    return perms.some((p) => p.startsWith(`${module}:`));
  }
  return false;
}

/** Expands a permission set adding implied read permissions (for UI checkboxes). */
export function withImpliedReads(perms: string[]): string[] {
  const out = new Set(perms);
  if (out.size > 0) out.add(PERMS.NODE_READ);
  if (out.has(PERMS.CONNECTORS_MANAGE)) out.add(PERMS.CONNECTORS_RUN);
  for (const p of perms) {
    const [module] = p.split(":");
    if (module && module !== "*") out.add(`${module}:read`);
  }
  return Array.from(out);
}
