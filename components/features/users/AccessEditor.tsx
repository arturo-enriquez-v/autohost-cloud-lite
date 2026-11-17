"use client"

import { useState } from "react"
import { ChevronDown, FolderKanban, Server, ShieldCheck, Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PermissionMatrix } from "./PermissionMatrix"
import type { PermissionsCatalog } from "@/lib/features/users/interfaces/user"
import type { Node } from "@/lib/features/nodes/types"
import type { Project } from "@/lib/types"

export interface ProjectAccessState {
  default_role: string
  all_nodes: boolean
  default_permissions: string[]
}

export interface NodeAccessState {
  role_preset: string
  permissions: string[]
}

export interface AccessState {
  projects: Record<string, ProjectAccessState>
  nodes: Record<string, NodeAccessState>
}

interface AccessEditorProps {
  catalog: PermissionsCatalog
  projects: Project[]
  nodes: Node[]
  value: AccessState
  onChange: (next: AccessState) => void
}

const NO_PROJECT = "__none__"

export function presetPermissions(catalog: PermissionsCatalog, presetId: string): string[] {
  return catalog.node_presets.find((p) => p.id === presetId)?.permissions ?? []
}

/** Presets selectable for non-admin users (the node "admin" preset is reserved for owners / global admins). */
function selectablePresets(catalog: PermissionsCatalog) {
  return catalog.node_presets.filter((p) => p.id !== "admin")
}

function effectivePerms(catalog: PermissionsCatalog, preset: string, custom: string[]) {
  return preset === "custom" ? custom : presetPermissions(catalog, preset)
}

function PresetSelect({
  catalog,
  value,
  onChange,
}: {
  catalog: PermissionsCatalog
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[150px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {selectablePresets(catalog).map((p) => (
          <SelectItem key={p.id} value={p.id} className="text-xs">
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function AccessEditor({ catalog, projects, nodes, value, onChange }: AccessEditorProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggleExpanded = (key: string) => setExpanded((e) => ({ ...e, [key]: !e[key] }))

  const groups: Array<{ id: string; name: string; nodes: Node[] }> = [
    ...projects.map((p) => ({ id: p.id, name: p.name, nodes: nodes.filter((n) => n.projectId === p.id) })),
  ]
  const orphanNodes = nodes.filter((n) => !n.projectId || !projects.some((p) => p.id === n.projectId))
  if (orphanNodes.length > 0) groups.push({ id: NO_PROJECT, name: "Unassigned", nodes: orphanNodes })

  // ─── Project mutations ────────────────────────────────────────────────
  const setProjectMember = (projectId: string, member: boolean, projectNodes: Node[]) => {
    const nextProjects = { ...value.projects }
    const nextNodes = { ...value.nodes }
    if (member) {
      nextProjects[projectId] = { default_role: "viewer", all_nodes: false, default_permissions: [] }
    } else {
      delete nextProjects[projectId]
      projectNodes.forEach((n) => delete nextNodes[n.id])
    }
    onChange({ projects: nextProjects, nodes: nextNodes })
  }

  const patchProject = (projectId: string, patch: Partial<ProjectAccessState>) => {
    onChange({
      ...value,
      projects: { ...value.projects, [projectId]: { ...value.projects[projectId], ...patch } },
    })
  }

  // ─── Node mutations ───────────────────────────────────────────────────
  const setNodeGranted = (nodeId: string, granted: boolean, projectId: string) => {
    const nextNodes = { ...value.nodes }
    const nextProjects = { ...value.projects }
    if (granted) {
      nextNodes[nodeId] = { role_preset: "viewer", permissions: [] }
      if (projectId !== NO_PROJECT && !nextProjects[projectId]) {
        nextProjects[projectId] = { default_role: "viewer", all_nodes: false, default_permissions: [] }
      }
    } else {
      delete nextNodes[nodeId]
    }
    onChange({ projects: nextProjects, nodes: nextNodes })
  }

  const patchNode = (nodeId: string, patch: Partial<NodeAccessState>) => {
    onChange({ ...value, nodes: { ...value.nodes, [nodeId]: { ...value.nodes[nodeId], ...patch } } })
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No projects or nodes registered yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isOrphan = group.id === NO_PROJECT
        const membership = isOrphan ? undefined : value.projects[group.id]
        const isMember = isOrphan || Boolean(membership)
        const grantedCount = group.nodes.filter((n) => value.nodes[n.id]).length
        const projectKey = `p:${group.id}`

        return (
          <div key={group.id} className="rounded-xl border border-border bg-card">
            {/* Project header */}
            <div className="flex flex-wrap items-center gap-3 p-3">
              {!isOrphan ? (
                <Switch
                  checked={isMember}
                  onCheckedChange={(v) => setProjectMember(group.id, v, group.nodes)}
                  aria-label={`Member of ${group.name}`}
                />
              ) : (
                <span className="w-8" />
              )}
              <FolderKanban className="h-4 w-4 text-[#70AEFF]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.nodes.length} node{group.nodes.length === 1 ? "" : "s"}
                  {isMember && !membership?.all_nodes && ` · ${grantedCount} with access`}
                  {membership?.all_nodes && " · access to all nodes"}
                </p>
              </div>
              {!isOrphan && isMember && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>All nodes</span>
                  <Switch
                    checked={Boolean(membership?.all_nodes)}
                    onCheckedChange={(v) => patchProject(group.id, { all_nodes: v })}
                  />
                </label>
              )}
            </div>

            {/* Project-wide default role (inherited by every node without explicit grant) */}
            {membership?.all_nodes && (
              <div className="border-t border-border bg-muted/10 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-medium">Default project role</span>
                  <PresetSelect
                    catalog={catalog}
                    value={membership.default_role}
                    onChange={(v) =>
                      patchProject(group.id, {
                        default_role: v,
                        default_permissions:
                          v === "custom" ? effectivePerms(catalog, membership.default_role, membership.default_permissions) : [],
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => toggleExpanded(projectKey)}
                    className="ml-auto flex items-center gap-1 text-xs text-[#70AEFF] hover:underline"
                  >
                    Permissions
                    <ChevronDown className={cn("h-3 w-3 transition-transform", expanded[projectKey] && "rotate-180")} />
                  </button>
                </div>
                {expanded[projectKey] && (
                  <div className="mt-3">
                    <PermissionMatrix
                      modules={catalog.modules}
                      value={effectivePerms(catalog, membership.default_role, membership.default_permissions)}
                      onChange={(perms) => patchProject(group.id, { default_role: "custom", default_permissions: perms })}
                    />
                  </div>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Nodes with explicit permissions below override this role.
                </p>
              </div>
            )}

            {/* Nodes */}
            {isMember && group.nodes.length > 0 && (
              <div className="divide-y divide-border border-t border-border">
                {group.nodes.map((node) => {
                  const grant = value.nodes[node.id]
                  const nodeKey = `n:${node.id}`
                  return (
                    <div key={node.id} className="p-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Switch
                          checked={Boolean(grant)}
                          onCheckedChange={(v) => setNodeGranted(node.id, v, group.id)}
                          aria-label={`Access to ${node.name}`}
                        />
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 truncate text-sm font-medium">
                            {node.name}
                            {node.status === "online" ? (
                              <Wifi className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <WifiOff className="h-3 w-3 text-muted-foreground" />
                            )}
                          </p>
                          <p className="truncate font-mono text-[10px] text-muted-foreground">{node.id}</p>
                        </div>
                        {grant ? (
                          <>
                            <PresetSelect
                              catalog={catalog}
                              value={grant.role_preset}
                              onChange={(v) =>
                                patchNode(node.id, {
                                  role_preset: v,
                                  permissions: v === "custom" ? effectivePerms(catalog, grant.role_preset, grant.permissions) : [],
                                })
                              }
                            />
                            <button
                              type="button"
                              onClick={() => toggleExpanded(nodeKey)}
                              className="flex items-center gap-1 text-xs text-[#70AEFF] hover:underline"
                            >
                              {effectivePerms(catalog, grant.role_preset, grant.permissions).length} permissions
                              <ChevronDown className={cn("h-3 w-3 transition-transform", expanded[nodeKey] && "rotate-180")} />
                            </button>
                          </>
                        ) : membership?.all_nodes ? (
                          <Badge variant="outline" className="text-[10px]">
                            Inherits: {catalog.node_presets.find((p) => p.id === membership.default_role)?.name ?? membership.default_role}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">No access</span>
                        )}
                      </div>
                      {grant && expanded[nodeKey] && (
                        <div className="mt-3">
                          <PermissionMatrix
                            modules={catalog.modules}
                            value={effectivePerms(catalog, grant.role_preset, grant.permissions)}
                            onChange={(perms) => patchNode(node.id, { role_preset: "custom", permissions: perms })}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {isMember && group.nodes.length === 0 && (
              <p className="border-t border-border p-3 text-xs text-muted-foreground">This project has no nodes yet.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
