"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Mail,
  Send,
  Plus,
  FolderKanban,
  Server,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Trash2,
  Edit2,
  Eye,
  Layers,
  Sparkles,
} from "lucide-react"
import { useReportSettings } from "@/lib/features/report-settings/hooks/useReportSettings"
import { useProjects } from "@/lib/features/projects/hooks/useProjects"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import type { Node } from "@/lib/features/nodes/types"

const UTC_HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHour(h: number) {
  const period = h < 12 ? "AM" : "PM"
  const display = h % 12 === 0 ? 12 : h % 12
  return `${String(display).padStart(2, "0")}:00 ${period} (UTC)`
}

export default function ReportsPage() {
  const { settings, isLoading: reportLoading, isSaving: reportSaving, error: reportError, save: saveSettings } = useReportSettings()
  const { projects, isLoading: projectsLoading, createProject, updateProject, deleteProject, assignNode, removeNode } = useProjects()
  const { allNodes, isLoading: nodesLoading, refresh: refreshNodes } = useNodes()

  // Trigger test email state
  const [isTriggering, setIsTriggering] = useState(false)
  const [triggerMessage, setTriggerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Create/Edit Group Modal state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [groupNameInput, setGroupNameInput] = useState("")
  const [groupSubmitting, setGroupSubmitting] = useState(false)
  const [groupError, setGroupError] = useState<string | null>(null)

  // Toggle report enable
  const handleToggleEnable = async (enabled: boolean) => {
    await saveSettings({ ...settings, enabled })
  }

  // Change delivery hour
  const handleHourChange = async (value: string) => {
    await saveSettings({ ...settings, hour_utc: Number(value) })
  }

  // Toggle node inclusion in daily report
  const handleToggleNodeInclusion = async (nodeId: string, currentlyIncluded: boolean) => {
    const currentExcluded = settings.excluded_node_ids || []
    let nextExcluded: string[]
    if (currentlyIncluded) {
      // Exclude node
      nextExcluded = Array.from(new Set([...currentExcluded, nodeId]))
    } else {
      // Include node
      nextExcluded = currentExcluded.filter((id) => id !== nodeId)
    }
    await saveSettings({ ...settings, excluded_node_ids: nextExcluded })
  }

  // Change node group assignment
  const handleGroupAssignment = async (nodeId: string, newProjectId: string) => {
    try {
      if (newProjectId === "unassigned") {
        await removeNode("", nodeId)
      } else {
        await assignNode(newProjectId, nodeId)
      }
      await refreshNodes()
    } catch (e: unknown) {
      console.error("Failed to reassign node group:", e)
    }
  }

  // Trigger test report
  const handleTriggerReport = async () => {
    setIsTriggering(true)
    setTriggerMessage(null)
    try {
      const res = await window.fetch("/api/reports/node-status", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setTriggerMessage({
          type: "success",
          text: `Reporte encolado correctamente (${data.nodes_total || 0} nodos procesados).`,
        })
      } else {
        setTriggerMessage({
          type: "error",
          text: data?.error || "No se pudo enviar el reporte de prueba",
        })
      }
    } catch {
      setTriggerMessage({ type: "error", text: "Error de red al solicitar reporte" })
    } finally {
      setIsTriggering(false)
    }
  }

  // Modal open helpers
  const openCreateGroupModal = () => {
    setEditingGroupId(null)
    setGroupNameInput("")
    setGroupError(null)
    setGroupDialogOpen(true)
  }

  const openEditGroupModal = (id: string, name: string) => {
    setEditingGroupId(id)
    setGroupNameInput(name)
    setGroupError(null)
    setGroupDialogOpen(true)
  }

  // Submit group form
  const handleSaveGroup = async () => {
    if (!groupNameInput.trim()) return
    setGroupSubmitting(true)
    setGroupError(null)
    try {
      if (editingGroupId) {
        await updateProject(editingGroupId, groupNameInput.trim())
      } else {
        await createProject(groupNameInput.trim())
      }
      setGroupDialogOpen(false)
      setGroupNameInput("")
    } catch (e: unknown) {
      setGroupError(e instanceof Error ? e.message : "Error al guardar el grupo")
    } finally {
      setGroupSubmitting(false)
    }
  }

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el grupo "${name}"? Los VPSs asignados pasarán a "Sin grupo".`)) return
    try {
      await deleteProject(id)
      await refreshNodes()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al eliminar grupo")
    }
  }

  // Group nodes mapping
  const excludedSet = useMemo(() => new Set(settings.excluded_node_ids || []), [settings.excluded_node_ids])

  const groupedNodes = useMemo(() => {
    const map: Record<string, { id: string; name: string; nodes: Node[] }> = {}

    // Initialize map with existing projects
    projects.forEach((p) => {
      map[p.id] = { id: p.id, name: p.name, nodes: [] }
    })

    const unassigned: Node[] = []

    allNodes.forEach((node) => {
      if (node.projectId && map[node.projectId]) {
        map[node.projectId].nodes.push(node)
      } else {
        unassigned.push(node)
      }
    })

    return {
      projectsList: Object.values(map),
      unassigned,
    }
  }, [projects, allNodes])

  // Included nodes for live report preview calculation
  const includedNodes = useMemo(() => {
    return allNodes.filter((n) => !excludedSet.has(n.id))
  }, [allNodes, excludedSet])

  const previewActiveCount = useMemo(() => {
    return includedNodes.filter((n) => n.status === "online" || (n.lastSeenAt && Date.now() - new Date(n.lastSeenAt).getTime() < 5 * 60 * 1000)).length
  }, [includedNodes])

  const previewUptimePct = useMemo(() => {
    if (includedNodes.length === 0) return 0
    return Math.round((previewActiveCount / includedNodes.length) * 100)
  }, [previewActiveCount, includedNodes.length])

  const previewAlertsCount = useMemo(() => {
    return includedNodes.filter((n) => n.cpu > 85 || n.ram > 85 || n.status !== "online").length
  }, [includedNodes])

  const isLoading = reportLoading || projectsLoading || nodesLoading

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Mail className="h-6 w-6 text-primary shrink-0" />
            Reportes por Correo
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Recibe reportes matutinos automatizados de tu infraestructura organizados por grupos de VPSs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <Button variant="outline" size="sm" onClick={openCreateGroupModal} className="flex-1 sm:flex-initial">
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo Grupo
          </Button>
          <Button
            size="sm"
            onClick={handleTriggerReport}
            disabled={isTriggering || !settings.enabled}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial"
          >
            {isTriggering ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-4 w-4" />
                Enviar Reporte Ahora
              </>
            )}
          </Button>
        </div>
      </div>

      {triggerMessage && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-4 text-sm font-medium ${
            triggerMessage.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {triggerMessage.type === "success" ? (
            <CheckCircle className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{triggerMessage.text}</span>
        </div>
      )}

      {reportError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{reportError}</span>
        </div>
      )}

      <div className="grid gap-8">
        {/* Card 1: Configuration */}
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
              Configuración del Reporte Matutino
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Ajusta la frecuencia y hora de envío del reporte diario a tu correo electrónico registrado.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6 pt-0 sm:pt-0">
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 items-start pt-2 border-t">
              {/* Enable Switch */}
              <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-muted/30 border gap-3 min-w-0">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <Label htmlFor="report-toggle-page" className="text-xs sm:text-sm font-semibold text-foreground cursor-pointer block truncate">
                    Habilitar reporte diario
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Envía un resumen de métricas, alertas y uptime a tu correo.
                  </p>
                </div>
                {reportLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                ) : (
                  <Switch
                    id="report-toggle-page"
                    checked={settings.enabled}
                    onCheckedChange={handleToggleEnable}
                    disabled={reportSaving}
                    className="shrink-0"
                  />
                )}
              </div>

              {/* UTC Delivery Time Selector */}
              <div className={`space-y-2 p-3 sm:p-4 rounded-xl bg-muted/30 border transition-opacity min-w-0 ${settings.enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                <Label htmlFor="report-hour-page" className="text-xs sm:text-sm font-semibold text-foreground">
                  Hora de entrega (UTC)
                </Label>
                <Select
                  value={String(settings.hour_utc)}
                  onValueChange={handleHourChange}
                  disabled={!settings.enabled || reportSaving || reportLoading}
                >
                  <SelectTrigger id="report-hour-page" className="w-full bg-background">
                    <SelectValue placeholder="Seleccionar hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {UTC_HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {formatHour(h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Todos los horarios están calculados en horario UTC.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Group & VPS Selection Management */}
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-muted-foreground shrink-0" />
                  Grupos & Selección de VPSs para el Reporte
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Organiza tus VPSs en grupos (proyectos) y selecciona individualmente cuales enviar en el correo diario.
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={openCreateGroupModal} className="shrink-0 self-start sm:self-auto">
                <Plus className="mr-1.5 h-4 w-4" />
                Crear Grupo
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6 pt-0 sm:pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Cargando grupos y nodos...
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                {/* List of Custom Groups */}
                {groupedNodes.projectsList.map((group) => (
                  <div key={group.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="flex items-center justify-between bg-muted/40 px-4 py-3 border-b">
                      <div className="flex items-center gap-2.5">
                        <FolderKanban className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-sm text-foreground">{group.name}</span>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {group.nodes.length} VPS{group.nodes.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditGroupModal(group.id, group.name)}
                          title="Renombrar grupo"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          title="Eliminar grupo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-4">
                      {group.nodes.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2 text-center">
                          No hay VPSs asignados a este grupo. Selecciona un grupo en los nodos de abajo para asignarlo.
                        </p>
                      ) : (
                        <div className="divide-y divide-border">
                          {group.nodes.map((node) => (
                            <NodeReportRow
                              key={node.id}
                              node={node}
                              projects={projects}
                              isIncluded={!excludedSet.has(node.id)}
                              onToggleInclusion={(included) => handleToggleNodeInclusion(node.id, !included)}
                              onGroupChange={(projId) => handleGroupAssignment(node.id, projId)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Unassigned Section */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between bg-muted/40 px-4 py-3 border-b">
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm text-foreground">Sin grupo</span>
                      <Badge variant="outline" className="text-xs font-normal">
                        {groupedNodes.unassigned.length} VPS{groupedNodes.unassigned.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    {groupedNodes.unassigned.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2 text-center">
                        Todos tus VPSs pertenecen a un grupo.
                      </p>
                    ) : (
                      <div className="divide-y divide-border">
                        {groupedNodes.unassigned.map((node) => (
                          <NodeReportRow
                            key={node.id}
                            node={node}
                            projects={projects}
                            isIncluded={!excludedSet.has(node.id)}
                            onToggleInclusion={(included) => handleToggleNodeInclusion(node.id, !included)}
                            onGroupChange={(projId) => handleGroupAssignment(node.id, projId)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Live Preview of Grouped Email Report */}
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary shrink-0" />
              Vista Previa del Reporte Matutino (Seccionado por Grupos)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Así es como se genera y envía la estructura del correo diario a tu casilla.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="rounded-xl border bg-card p-3.5 sm:p-6 space-y-6 font-mono text-sm shadow-inner max-w-full overflow-hidden">
              {/* Resumen de la Mañana */}
              <div className="space-y-2 border-b pb-4">
                <div className="flex items-center gap-2 text-base font-bold text-foreground font-sans">
                  <span>☕ Resumen de la Mañana</span>
                  <Badge variant="outline" className="text-xs font-mono font-normal">
                    {new Date().toISOString().split("T")[0]}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground font-sans">
                  La infraestructura distribuida de AutoHost ha mantenido un rendimiento con un uptime promedio global del{" "}
                  <strong className="text-foreground">{previewUptimePct}%</strong> en las últimas 24 horas. Actualmente hay{" "}
                  <strong className="text-foreground">{previewAlertsCount}</strong> de <strong className="text-foreground">{includedNodes.length}</strong> VPSs en alerta de los incluidos en este reporte.
                </p>
              </div>

              {/* Diagnostico de Nodos por Grupos */}
              <div className="space-y-4">
                <div className="text-base font-bold text-foreground font-sans flex items-center gap-2">
                  <span>📊 Diagnóstico de Nodos por Grupos</span>
                </div>

                {includedNodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic font-sans">
                    No has seleccionado ningún VPS para incluir en el reporte diario.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {/* Preview Custom Groups */}
                    {groupedNodes.projectsList.map((group) => {
                      const groupIncluded = group.nodes.filter((n) => !excludedSet.has(n.id))
                      if (groupIncluded.length === 0) return null
                      return (
                        <div key={group.id} className="space-y-2">
                          <div className="text-xs font-bold text-primary font-sans flex items-center gap-1.5">
                            <FolderKanban className="h-3.5 w-3.5" />
                            <span>Grupo: {group.name}</span>
                          </div>
                          <ReportPreviewTable nodes={groupIncluded} />
                        </div>
                      )
                    })}

                    {/* Preview Unassigned Group */}
                    {(() => {
                      const unassignedIncluded = groupedNodes.unassigned.filter((n) => !excludedSet.has(n.id))
                      if (unassignedIncluded.length === 0) return null
                      return (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-muted-foreground font-sans flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5" />
                            <span>Sin grupo</span>
                          </div>
                          <ReportPreviewTable nodes={unassignedIncluded} />
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Umbrales */}
              {includedNodes.length > 0 && (
                <div className="space-y-2 pt-4 border-t text-xs font-sans text-muted-foreground">
                  <div className="font-semibold text-foreground">Umbrales configurados:</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] font-mono">
                    {includedNodes.map((n) => (
                      <li key={n.id}>
                        <strong className="text-foreground">{n.hostname}:</strong> CPU ≤ 80% | RAM ≤ 80% | Disco ≤ 80 GB | Offline: sí
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Create or Edit Group */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroupId ? "Renombrar Grupo" : "Crear Nuevo Grupo de VPSs"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">Nombre del Grupo</Label>
              <Input
                id="group-name"
                placeholder="Ej. Producción, Google Landings, Databases"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveGroup()}
                autoFocus
              />
            </div>
            {groupError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {groupError}
              </p>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGroup} disabled={groupSubmitting || !groupNameInput.trim()}>
              {groupSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editingGroupId ? "Guardar Cambios" : "Crear Grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Single node row component for Card 2
function NodeReportRow({
  node,
  projects,
  isIncluded,
  onToggleInclusion,
  onGroupChange,
}: {
  node: Node
  projects: { id: string; name: string }[]
  isIncluded: boolean
  onToggleInclusion: (included: boolean) => void
  onGroupChange: (projectId: string) => void
}) {
  const isOnline = node.status === "online" || (node.lastSeenAt && Date.now() - new Date(node.lastSeenAt).getTime() < 5 * 60 * 1000)
  const hasAlerts = node.cpu > 85 || node.ram > 85
  const hostname = node.hostname || node.name || "node"

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <Server className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">{hostname}</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                hasAlerts
                  ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                  : isOnline
                  ? "border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10"
                  : "border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              {hasAlerts ? "⚠️ Alerta" : isOnline ? "✅ Normal" : "Offline"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            IP: {node.ipLocal || "—"} | RAM: {node.ram?.toFixed(1) ?? "0"}% | CPU: {node.cpu?.toFixed(1) ?? "0"}%
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
        {/* Project Selector */}
        <div className="flex-1 sm:flex-initial sm:w-40 min-w-0">
          <Select value={node.projectId || "unassigned"} onValueChange={onGroupChange}>
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue placeholder="Seleccionar grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Sin grupo</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Included Toggle */}
        <div className="flex items-center gap-2 border-l pl-3 shrink-0">
          <Switch
            id={`inc-${node.id}`}
            checked={isIncluded}
            onCheckedChange={onToggleInclusion}
          />
          <Label htmlFor={`inc-${node.id}`} className="text-xs font-medium cursor-pointer">
            {isIncluded ? "Incluido" : "Excluido"}
          </Label>
        </div>
      </div>
    </div>
  )
}

// Table component for Live Report Preview
function ReportPreviewTable({ nodes }: { nodes: Node[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <table className="w-full text-left text-xs font-mono">
        <thead className="border-b bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="py-2 px-3">Nodo</th>
            <th className="py-2 px-3">CPU Avg</th>
            <th className="py-2 px-3">CPU Pico</th>
            <th className="py-2 px-3">RAM Avg</th>
            <th className="py-2 px-3">Disco Libre</th>
            <th className="py-2 px-3">Alertas 24h</th>
            <th className="py-2 px-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {nodes.map((node) => {
            const cpu = node.cpu ?? 0
            const ram = node.ram ?? 0
            const disk = node.disk ?? 0
            const isOnline = node.status === "online" || (node.lastSeenAt && Date.now() - new Date(node.lastSeenAt).getTime() < 5 * 60 * 1000)
            const hasAlerts = cpu > 85 || ram > 85

            let estado = "✅ Normal"
            if (!isOnline) estado = "⬛ Offline"
            else if (hasAlerts) estado = "⚠️ Alerta"

            const hostname = node.hostname || node.name || "node"

            return (
              <tr key={node.id} className="hover:bg-muted/20">
                <td className="py-2 px-3 font-semibold text-foreground">{hostname}</td>
                <td className="py-2 px-3">{cpu.toFixed(1)}%</td>
                <td className="py-2 px-3">{(cpu * 1.1).toFixed(1)}%</td>
                <td className="py-2 px-3">{ram.toFixed(1)}%</td>
                <td className="py-2 px-3">{disk.toFixed(1)} GB</td>
                <td className="py-2 px-3">
                  {hasAlerts ? "1 (cpu/ram)" : "0 ( )"}
                </td>
                <td className="py-2 px-3">{estado}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
