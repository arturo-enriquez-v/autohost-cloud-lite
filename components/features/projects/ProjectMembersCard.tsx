"use client"

import { useCallback, useEffect, useState } from "react"
import { Users, UserPlus, Trash2, Pencil, Server, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fetchWithAuth } from "@/lib/api/fetch-client"
import { useUsers, usePermissionsCatalog } from "@/lib/features/users/hooks/useUsers"
import { PermissionMatrix } from "@/components/features/users/PermissionMatrix"
import { presetPermissions } from "@/components/features/users/AccessEditor"
import type { ManagedUser, NodePermissionGrant, NodePermissionGrantInput, PermissionsCatalog } from "@/lib/features/users/interfaces/user"
import type { Node } from "@/lib/features/nodes/types"

interface ProjectMemberDetail {
  user_id: string
  email: string
  name: string
  avatar_url: string
  role: string
  is_active: boolean
  project_id: string
  default_role: string
  all_nodes: boolean
  default_permissions: string[]
  node_permissions: NodePermissionGrant[]
}

interface Props {
  projectId: string
  projectName: string
  projectNodes: Node[]
}

function getEffectivePerms(catalog: PermissionsCatalog, preset: string, perms: string[]) {
  return preset === "custom" ? perms : presetPermissions(catalog, preset)
}

export function ProjectMembersCard({ projectId, projectName, projectNodes }: Props) {
  const { users } = useUsers()
  const { catalog } = usePermissionsCatalog()

  const [members, setMembers] = useState<ProjectMemberDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [allNodes, setAllNodes] = useState(false)
  const [defaultRole, setDefaultRole] = useState("viewer")
  const [defaultPerms, setDefaultPerms] = useState<string[]>([])
  const [nodeGrants, setNodeGrants] = useState<Record<string, { role_preset: string; permissions: string[] }>>({})
  const [expandedNode, setExpandedNode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/members`, { method: "GET" })
      if (res.ok) {
        const data = await res.json()
        setMembers(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const memberUsers = users.filter((u) => u.role !== "admin")
  const nonMembers = memberUsers.filter((u) => !members.some((m) => m.user_id === u.id))

  const openAdd = () => {
    setSelectedUserId(nonMembers[0]?.id ?? "")
    setAllNodes(false)
    setDefaultRole("viewer")
    setDefaultPerms([])
    setNodeGrants({})
    setExpandedNode(null)
    setDialogOpen(true)
  }

  const openEdit = (m: ProjectMemberDetail) => {
    setSelectedUserId(m.user_id)
    setAllNodes(m.all_nodes)
    setDefaultRole(m.default_role || "viewer")
    setDefaultPerms(m.default_permissions ?? [])
    const map: Record<string, { role_preset: string; permissions: string[] }> = {}
    for (const np of m.node_permissions ?? []) {
      map[np.node_id] = { role_preset: np.role_preset || "viewer", permissions: np.permissions ?? [] }
    }
    setNodeGrants(map)
    setExpandedNode(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!selectedUserId) return
    setSaving(true)
    try {
      const node_permissions: NodePermissionGrantInput[] = Object.entries(nodeGrants).map(([node_id, g]) => ({
        node_id,
        project_id: projectId,
        role_preset: g.role_preset,
        permissions: g.role_preset === "custom" ? g.permissions : undefined,
      }))

      // POST /api/projects/{id}/members assigns user and replaces permissions for the nodes submitted;
      // If editing an existing member and a node was unchecked, remove it explicitly too.
      const existing = members.find((m) => m.user_id === selectedUserId)
      if (existing) {
        for (const prev of existing.node_permissions ?? []) {
          if (!nodeGrants[prev.node_id]) {
            await fetchWithAuth(`/api/users/${selectedUserId}/nodes/${prev.node_id}/permissions`, {
              method: "DELETE",
            })
          }
        }
      }

      const res = await fetchWithAuth(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUserId,
          default_role: defaultRole,
          all_nodes: allNodes,
          default_permissions: defaultRole === "custom" ? defaultPerms : [],
          node_permissions,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Error al guardar miembro")
      }
      toast.success("Permisos del proyecto actualizados")
      setDialogOpen(false)
      await loadMembers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (m: ProjectMemberDetail) => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/members/${m.user_id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("No se pudo remover al miembro")
      toast.success(`${m.email} removido de ${projectName}`)
      await loadMembers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    }
  }

  const selectablePresets = catalog?.node_presets.filter((p) => p.id !== "admin") ?? []
  const nodeNameMap = new Map(projectNodes.map((n) => [n.id, n.name || n.hostname || n.id]))

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#70AEFF]" />
              Miembros del proyecto{" "}
              <span className="text-muted-foreground font-normal">({members.length})</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Los administradores globales siempre tienen acceso total. Aquí asignas usuarios miembros y sus permisos por nodo en este proyecto.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={openAdd} disabled={nonMembers.length === 0}>
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar miembro
          </Button>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Ningún usuario miembro asignado aún a este proyecto.
              {memberUsers.length === 0 && " Crea primero usuarios con rol 'Miembro' en Usuarios y Permisos."}
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {members.map((m) => (
                <div key={m.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.name || m.email}{" "}
                      <span className="text-xs font-normal text-muted-foreground">({m.email})</span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {m.all_nodes && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 gap-1">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          Todos los nodos ({m.default_role})
                        </Badge>
                      )}
                      {(m.node_permissions ?? []).map((np) => (
                        <Badge key={np.node_id} variant="outline" className="text-[10px] gap-1">
                          <Server className="h-2.5 w-2.5 text-[#70AEFF]" />
                          {np.node_hostname || nodeNameMap.get(np.node_id) || np.node_id}: {np.role_preset}
                        </Badge>
                      ))}
                      {!m.all_nodes && (m.node_permissions ?? []).length === 0 && (
                        <span className="text-xs text-muted-foreground">Sin nodos asignados</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(m)} className="h-8 gap-1 text-xs">
                      <Pencil className="h-3.5 w-3.5" />
                      Permisos
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(m)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Quitar del proyecto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>Permisos de miembro en &quot;{projectName}&quot;</DialogTitle>
            <DialogDescription>
              Selecciona el usuario miembro y los permisos exactos sobre los nodos de este proyecto.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Usuario</label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={members.some((m) => m.user_id === selectedUserId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario miembro" />
                </SelectTrigger>
                <SelectContent>
                  {memberUsers.map((u: ManagedUser) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <p className="text-sm font-medium">Acceso a todos los nodos del proyecto</p>
                <p className="text-xs text-muted-foreground">
                  Si se activa, heredará el rol por defecto en cualquier nodo presente o futuro de este proyecto.
                </p>
              </div>
              <Switch checked={allNodes} onCheckedChange={setAllNodes} />
            </div>

            {allNodes && catalog && (
              <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">Rol por defecto en el proyecto</span>
                  <Select value={defaultRole} onValueChange={setDefaultRole}>
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectablePresets.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {defaultRole === "custom" && (
                  <PermissionMatrix
                    modules={catalog.modules}
                    value={defaultPerms}
                    onChange={setDefaultPerms}
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nodos en {projectName} ({projectNodes.length})
              </p>
              {projectNodes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Este proyecto todavía no tiene nodos asignados.</p>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {projectNodes.map((n) => {
                    const g = nodeGrants[n.id]
                    const isExpanded = expandedNode === n.id
                    return (
                      <div key={n.id} className="p-3 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Switch
                            checked={Boolean(g)}
                            onCheckedChange={(on) => {
                              setNodeGrants((prev) => {
                                const next = { ...prev }
                                if (on) next[n.id] = { role_preset: "viewer", permissions: [] }
                                else delete next[n.id]
                                return next
                              })
                            }}
                          />
                          <Server className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium flex-1 truncate">{n.name || n.hostname}</span>
                          {g && catalog && (
                            <>
                              <Select
                                value={g.role_preset}
                                onValueChange={(v) =>
                                  setNodeGrants((prev) => ({
                                    ...prev,
                                    [n.id]: {
                                      role_preset: v,
                                      permissions:
                                        v === "custom" ? getEffectivePerms(catalog, g.role_preset, g.permissions) : [],
                                    },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-8 w-[150px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectablePresets.map((p) => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <button
                                type="button"
                                onClick={() => setExpandedNode(isExpanded ? null : n.id)}
                                className="text-xs text-[#70AEFF] hover:underline"
                              >
                                {isExpanded ? "Ocultar" : "Granular"}
                              </button>
                            </>
                          )}
                        </div>
                        {g && isExpanded && catalog && (
                          <PermissionMatrix
                            modules={catalog.modules}
                            value={getEffectivePerms(catalog, g.role_preset, g.permissions)}
                            onChange={(perms) =>
                              setNodeGrants((prev) => ({
                                ...prev,
                                [n.id]: { role_preset: "custom", permissions: perms },
                              }))
                            }
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-border px-6 py-4 bg-muted/10">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !selectedUserId}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar permisos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
