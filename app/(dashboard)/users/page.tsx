"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Pencil,
  Trash2,
  KeyRound,
  FolderKanban,
  Server,
  Loader2,
  BookOpen,
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCurrentUser } from "@/lib/context/current-user-context"
import { useUsers, usePermissionsCatalog } from "@/lib/features/users/hooks/useUsers"
import { useProjects } from "@/lib/features/projects/hooks/useProjects"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import { UserDialog } from "@/components/features/users/UserDialog"
import type { ManagedUser } from "@/lib/features/users/interfaces/user"
import { PageHeader } from "@/components/layout/PageHeader"

function presetBadgeClass(preset: string) {
  switch (preset) {
    case "editor":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    case "operator":
      return "bg-[#70AEFF]/15 text-[#70AEFF] border-[#70AEFF]/30"
    case "custom":
      return "bg-purple-500/15 text-purple-300 border-purple-500/30"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

export default function UsersPage() {
  const router = useRouter()
  const { user: currentUser, isAdmin, isLoading: authLoading } = useCurrentUser()
  const { users, isLoading, error, createUser, updateUser, deleteUser, refresh } = useUsers()
  const { catalog } = usePermissionsCatalog()
  const { projects } = useProjects()
  const { allNodes } = useNodes()

  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "member">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTab, setDialogTab] = useState<"profile" | "permissions">("profile")
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)

  const nodeNames = useMemo(() => new Map(allNodes.map((n) => [n.id, n.name || n.hostname || n.id])), [allNodes])
  const projectNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false
      if (!q) return true
      return (
        u.email.toLowerCase().includes(q) ||
        (u.name || "").toLowerCase().includes(q)
      )
    })
  }, [users, query, roleFilter])

  const adminCount = users.filter((u) => u.role === "admin").length
  const memberCount = users.filter((u) => u.role !== "admin").length
  const activeCount = users.filter((u) => u.is_active).length

  const openCreate = () => {
    setEditingUser(null)
    setDialogTab("profile")
    setDialogOpen(true)
  }

  const openEdit = (u: ManagedUser, tab: "profile" | "permissions" = "profile") => {
    setEditingUser(u)
    setDialogTab(tab)
    setDialogOpen(true)
  }

  const handleToggleActive = async (u: ManagedUser, nextActive: boolean) => {
    try {
      await updateUser(u.id, { is_active: nextActive })
      toast.success(nextActive ? `User ${u.email} activated` : `User ${u.email} deactivated`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      toast.success(`User ${deleteTarget.email} deleted`)
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete user")
    } finally {
      setDeleting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-lg mt-12">
        <CardContent className="flex flex-col items-center py-12 text-center gap-3">
          <ShieldAlert className="h-10 w-10 text-amber-400" />
          <h2 className="text-lg font-semibold">Restricted Access</h2>
          <p className="text-sm text-muted-foreground">
            Only global administrators can manage users and permissions.
          </p>
          <Button variant="outline" onClick={() => router.push("/")} className="mt-2">
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Users}
        title="Users & Permissions"
        description="Manage accounts, global roles, and granular access by project and node."
        actions={
          <>
            {catalog && (
              <Button variant="outline" onClick={() => setCatalogOpen(true)} className="gap-2">
                <BookOpen className="h-4 w-4" />
                Permissions Guide
              </Button>
            )}
            <Button onClick={openCreate} className="gap-2">
              <UserPlus className="h-4 w-4" />
              New user
            </Button>
          </>
        }
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total users</CardDescription>
            <CardTitle className="text-2xl">{users.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {activeCount} active · {users.length - activeCount} inactive
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Administrators</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {adminCount}
              <ShieldCheck className="h-5 w-5 text-amber-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Unrestricted access across the entire platform
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Members with granular access</CardDescription>
            <CardTitle className="text-2xl">{memberCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {catalog ? `${catalog.modules.reduce((acc, m) => acc + m.permissions.length, 0)} permissions across ${catalog.modules.length} modules` : "Control by project and node"}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={refresh}>Retry</Button>
        </div>
      )}

      {/* Search & filter bar */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by name or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs self-start">
            {(["all", "admin", "member"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  roleFilter === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "all" ? `All (${users.length})` : r === "admin" ? `Admins (${adminCount})` : `Members (${memberCount})`}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {filteredUsers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No users found with that filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Projects & Nodes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const isSelf = currentUser?.uid === u.id
                    const initials = (u.name || u.email)
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs ring-1 ring-primary/20">
                              {initials || "?"}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {u.name || u.email.split("@")[0]}
                                </span>
                                {isSelf && (
                                  <Badge variant="outline" className="text-[10px] border-[#70AEFF]/40 text-[#70AEFF]">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {u.role === "admin" ? (
                            <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Member
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {u.role === "admin" ? (
                            <span className="text-xs text-muted-foreground">
                              Full access to the entire platform
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1.5 max-w-md">
                              {u.projects.length === 0 && u.node_permissions.length === 0 ? (
                                <span className="text-xs text-amber-400">No access assigned yet</span>
                              ) : (
                                <>
                                  {u.projects.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {u.projects.map((pm) => (
                                        <Badge key={pm.project_id} variant="outline" className="text-[10px] gap-1">
                                          <FolderKanban className="h-2.5 w-2.5 text-[#70AEFF]" />
                                          {pm.project_name || projectNames.get(pm.project_id) || pm.project_id}
                                          {pm.all_nodes ? ` · all (${pm.default_role})` : ""}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  {u.node_permissions.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {u.node_permissions.map((np) => (
                                        <Badge
                                          key={np.node_id}
                                          variant="outline"
                                          className={`text-[10px] gap-1 ${presetBadgeClass(np.role_preset)}`}
                                        >
                                          <Server className="h-2.5 w-2.5" />
                                          {np.node_hostname || nodeNames.get(np.node_id) || np.node_id}:{" "}
                                          <span className="font-semibold">{np.role_preset}</span>
                                          {np.role_preset === "custom" ? ` (${np.permissions.length})` : ""}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={u.is_active}
                              disabled={isSelf}
                              onCheckedChange={(v) => handleToggleActive(u, v)}
                              aria-label={`Status of ${u.email}`}
                            />
                            <span className={`text-xs ${u.is_active ? "text-emerald-400" : "text-muted-foreground"}`}>
                              {u.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {u.role !== "admin" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-xs text-[#70AEFF] hover:text-[#70AEFF]"
                                onClick={() => openEdit(u, "permissions")}
                                title="Configure granular permissions"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Permissions</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(u, "profile")}
                              title="Edit user"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isSelf}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-30"
                              onClick={() => setDeleteTarget(u)}
                              title={isSelf ? "You cannot delete your own account" : "Delete user"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
        currentUserId={currentUser?.uid}
        defaultTab={dialogTab}
        catalog={catalog}
        projects={projects}
        nodes={allNodes}
        onCreate={async (input) => {
          const created = await createUser(input)
          toast.success(`User ${input.email} created`)
          return created
        }}
        onUpdate={async (id, input) => {
          const updated = await updateUser(id, input)
          toast.success("User updated")
          return updated
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user {deleteTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              All their sessions, project memberships, and node permissions will be revoked. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Catalog Legend Dialog */}
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Presets & Granular Permissions Catalog</DialogTitle>
          </DialogHeader>
          {catalog && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.node_presets.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{p.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{p.id}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.modules.map((m) => (
                  <div key={m.module} className="rounded-lg border border-border p-3">
                    <p className="font-semibold text-xs uppercase tracking-wide text-[#70AEFF]">{m.label}</p>
                    <p className="text-[11px] text-muted-foreground mb-2">{m.description}</p>
                    <ul className="space-y-1">
                      {m.permissions.map((perm) => (
                        <li key={perm.key} className="text-xs flex items-center justify-between gap-2">
                          <span>{perm.label}</span>
                          <code className="font-mono text-[10px] text-muted-foreground">{perm.key}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
