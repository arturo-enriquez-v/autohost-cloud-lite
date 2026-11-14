"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldAlert, ShieldCheck, UserCog, UserPlus, KeyRound, Eye, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { AccessEditor, type AccessState } from "./AccessEditor"
import type {
  CreateUserInput,
  GlobalRole,
  ManagedUser,
  NodePermissionGrantInput,
  PermissionsCatalog,
  ProjectMembershipInput,
  UpdateUserInput,
} from "@/lib/features/users/interfaces/user"
import type { Node } from "@/lib/features/nodes/types"
import type { Project } from "@/lib/types"

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: ManagedUser | null
  currentUserId?: string
  defaultTab?: "profile" | "permissions"
  catalog: PermissionsCatalog | null
  projects: Project[]
  nodes: Node[]
  onCreate: (input: CreateUserInput) => Promise<unknown>
  onUpdate: (id: string, input: UpdateUserInput) => Promise<unknown>
}

function toAccessState(user: ManagedUser | null): AccessState {
  const projects: AccessState["projects"] = {}
  const nodes: AccessState["nodes"] = {}

  if (user) {
    for (const pm of user.projects ?? []) {
      projects[pm.project_id] = {
        default_role: pm.default_role || "viewer",
        all_nodes: Boolean(pm.all_nodes),
        default_permissions: pm.default_permissions ?? [],
      }
    }
    for (const np of user.node_permissions ?? []) {
      nodes[np.node_id] = {
        role_preset: np.role_preset || "viewer",
        permissions: np.permissions ?? [],
      }
    }
  }

  return { projects, nodes }
}

function serializeAccess(access: AccessState, allNodes: Node[]): {
  projects: ProjectMembershipInput[]
  node_permissions: NodePermissionGrantInput[]
} {
  const projects: ProjectMembershipInput[] = Object.entries(access.projects).map(([project_id, p]) => ({
    project_id,
    default_role: p.default_role,
    all_nodes: p.all_nodes,
    default_permissions: p.default_role === "custom" ? p.default_permissions : undefined,
  }))

  const nodeProjectMap = new Map(allNodes.map((n) => [n.id, n.projectId ?? null]))
  const node_permissions: NodePermissionGrantInput[] = Object.entries(access.nodes).map(([node_id, g]) => ({
    node_id,
    project_id: nodeProjectMap.get(node_id) ?? null,
    role_preset: g.role_preset,
    permissions: g.role_preset === "custom" ? g.permissions : undefined,
  }))

  return { projects, node_permissions }
}

export function UserDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  defaultTab = "profile",
  catalog,
  projects,
  nodes,
  onCreate,
  onUpdate,
}: UserDialogProps) {
  const isEditing = Boolean(user)
  const isSelf = Boolean(user && currentUserId && user.id === currentUserId)

  const [tab, setTab] = useState<"profile" | "permissions">(defaultTab)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<GlobalRole>("member")
  const [isActive, setIsActive] = useState(true)
  const [access, setAccess] = useState<AccessState>({ projects: {}, nodes: {} })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTab(user?.role === "admin" ? "profile" : defaultTab)
    setName(user?.name ?? "")
    setEmail(user?.email ?? "")
    setPassword("")
    setShowPassword(false)
    setRole(user?.role ?? "member")
    setIsActive(user ? user.is_active : true)
    setAccess(toAccessState(user))
    setError(null)
  }, [open, user, defaultTab])

  const projectCount = Object.keys(access.projects).length
  const nodeGrantCount = Object.keys(access.nodes).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()
    if (!trimmedEmail) {
      setError("El correo electrónico es obligatorio.")
      setTab("profile")
      return
    }
    if (!isEditing && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      setTab("profile")
      return
    }
    if (isEditing && password.length > 0 && password.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.")
      setTab("profile")
      return
    }

    const { projects: projInputs, node_permissions } = serializeAccess(access, nodes)

    setSubmitting(true)
    try {
      if (isEditing && user) {
        const payload: UpdateUserInput = {
          email: trimmedEmail,
          name: trimmedName,
          role,
          is_active: isActive,
          projects: role === "admin" ? [] : projInputs,
          node_permissions: role === "admin" ? [] : node_permissions,
        }
        if (password.trim()) payload.password = password
        await onUpdate(user.id, payload)
      } else {
        await onCreate({
          email: trimmedEmail,
          name: trimmedName,
          password,
          role,
          is_active: isActive,
          projects: role === "admin" ? [] : projInputs,
          node_permissions: role === "admin" ? [] : node_permissions,
        })
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el usuario")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isEditing ? <UserCog className="h-5 w-5 text-[#70AEFF]" /> : <UserPlus className="h-5 w-5 text-[#70AEFF]" />}
            {isEditing ? `Editar usuario: ${user?.name || user?.email}` : "Crear nuevo usuario"}
          </DialogTitle>
          <DialogDescription>
            Configura las credenciales, rol global, acceso a proyectos y permisos granulares por nodo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "profile" | "permissions")}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="px-6 pt-3 border-b border-border bg-muted/20">
              <TabsList className="mb-3">
                <TabsTrigger value="profile">Datos y Rol</TabsTrigger>
                <TabsTrigger value="permissions" disabled={role === "admin"} className="gap-1.5">
                  Proyectos y Permisos por Nodo
                  {role === "member" && (projectCount > 0 || nodeGrantCount > 0) && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                      {projectCount}P · {nodeGrantCount}N
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <TabsContent value="profile" className="mt-0 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Nombre</Label>
                    <Input
                      id="user-name"
                      placeholder="Ej. Carlos Mendoza"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-email">Correo electrónico *</Label>
                    <Input
                      id="user-email"
                      type="email"
                      placeholder="usuario@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-password" className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    {isEditing ? "Nueva contraseña (opcional)" : "Contraseña *"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="user-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={isEditing ? "Dejar en blanco para conservar la contraseña actual" : "Mínimo 6 caracteres"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!isEditing}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Rol global en la plataforma</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={isSelf}
                      onClick={() => setRole("member")}
                      className={cn(
                        "rounded-xl border p-3.5 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                        role === "member"
                          ? "border-[#70AEFF] bg-[#70AEFF]/10 ring-1 ring-[#70AEFF]/40"
                          : "border-border hover:border-[#70AEFF]/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Miembro (Member)</span>
                        <Badge variant="outline" className="text-[10px]">Granular</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Solo accede a los proyectos y nodos asignados, con los permisos específicos por módulo que definas.
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={isSelf}
                      onClick={() => setRole("admin")}
                      className={cn(
                        "rounded-xl border p-3.5 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                        role === "admin"
                          ? "border-amber-400 bg-amber-500/10 ring-1 ring-amber-400/40"
                          : "border-border hover:border-amber-400/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-amber-400" />
                          Administrador (Admin)
                        </span>
                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                          Acceso total
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Control completo de proyectos, todos los nodos, configuraciones globales y gestión de usuarios.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3.5">
                  <div>
                    <p className="text-sm font-medium">Cuenta activa</p>
                    <p className="text-xs text-muted-foreground">
                      {isSelf
                        ? "No puedes desactivar tu propia cuenta."
                        : "Si la desactivas, el usuario no podrá iniciar sesión y se revocarán sus tokens."}
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    disabled={isSelf}
                    onCheckedChange={setIsActive}
                    aria-label="Cuenta activa"
                  />
                </div>

                {role === "member" && (
                  <div className="flex items-center justify-between rounded-xl border border-dashed border-[#70AEFF]/40 bg-[#70AEFF]/5 p-3.5">
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">
                        Proyectos y nodos ({projectCount} proyectos · {nodeGrantCount} nodos configurados)
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Configura qué nodos puede ver y qué acciones puede ejecutar en cada uno.
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => setTab("permissions")}>
                      Configurar permisos →
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="permissions" className="mt-0 space-y-3">
                {role === "admin" ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                    Los usuarios con rol <strong>Admin</strong> tienen acceso irrestricto a toda la plataforma; no necesitan permisos por nodo.
                  </div>
                ) : !catalog ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground">
                      Activa los <strong>proyectos</strong> a los que pertenece el usuario, luego selecciona los <strong>nodos</strong> y elige un preset rápido (<code className="font-mono">Viewer</code>, <code className="font-mono">Operator</code>, <code className="font-mono">Editor</code>) o personaliza cada acción.
                    </div>
                    <AccessEditor
                      catalog={catalog}
                      projects={projects}
                      nodes={nodes}
                      value={access}
                      onChange={setAccess}
                    />
                  </>
                )}
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="border-t border-border px-6 py-4 bg-muted/10">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : isEditing ? (
                "Guardar cambios"
              ) : (
                "Crear usuario"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
