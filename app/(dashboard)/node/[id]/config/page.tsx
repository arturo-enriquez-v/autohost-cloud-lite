"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Bell, Check, Loader2, Send, Pencil, Trash2, TriangleAlert } from "lucide-react"
import { useNode } from "@/lib/hooks/useNode"
import { useNodeAlerts } from "@/lib/hooks/useNodeAlerts"
import { useNodes } from "@/lib/hooks/useNodes"

export default function NodeConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()

  const { node, isLoading: nodeLoading } = useNode(nodeId)
  const { updateNode, deleteNode } = useNodes()

  // Rename state
  const [renameValue, setRenameValue] = useState("")
  const [renameLoading, setRenameLoading] = useState(false)
  const [renameSaved, setRenameSaved] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renameSynced, setRenameSynced] = useState(false)
  if (!nodeLoading && node && !renameSynced) {
    setRenameSynced(true)
    setRenameValue(node.hostname || node.name || "")
  }

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleRename = async () => {
    if (!renameValue.trim()) { setRenameError("El nombre no puede estar vacío"); return }
    try {
      setRenameLoading(true); setRenameError(null)
      await updateNode(nodeId, renameValue.trim())
      setRenameSaved(true)
      setTimeout(() => setRenameSaved(false), 2000)
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Error al renombrar")
    } finally {
      setRenameLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleteLoading(true); setDeleteError(null)
      await deleteNode(nodeId)
      router.push("/nodes")
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar el nodo")
      setDeleteLoading(false)
    }
  }
  const {
    config: alertConfig,
    isLoading: alertsLoading,
    isSaving: alertsSaving,
    saved: alertsSaved,
    error: alertsError,
    save: saveAlerts,
  } = useNodeAlerts(nodeId)

  const [alertForm, setAlertForm] = useState({
    telegramBotToken: "",
    telegramChatId: "",
    cpuThreshold: "" as string,
    ramThreshold: "" as string,
    diskThreshold: "" as string,
    alertOnOffline: false,
  })
  const [alertFormSynced, setAlertFormSynced] = useState(false)
  if (!alertsLoading && !alertFormSynced) {
    setAlertFormSynced(true)
    setAlertForm({
      telegramBotToken: alertConfig.telegramBotToken ?? "",
      telegramChatId: alertConfig.telegramChatId ?? "",
      cpuThreshold: alertConfig.cpuThreshold != null ? String(alertConfig.cpuThreshold) : "",
      ramThreshold: alertConfig.ramThreshold != null ? String(alertConfig.ramThreshold) : "",
      diskThreshold: alertConfig.diskThreshold != null ? String(alertConfig.diskThreshold) : "",
      alertOnOffline: alertConfig.alertOnOffline ?? false,
    })
  }

  const handleSaveAlerts = async () => {
    const parseThreshold = (v: string) => {
      const n = parseFloat(v)
      return isNaN(n) ? null : Math.min(100, Math.max(0, n))
    }
    await saveAlerts({
      telegramBotToken: alertForm.telegramBotToken,
      telegramChatId: alertForm.telegramChatId,
      cpuThreshold: parseThreshold(alertForm.cpuThreshold),
      ramThreshold: parseThreshold(alertForm.ramThreshold),
      diskThreshold: parseThreshold(alertForm.diskThreshold),
      alertOnOffline: alertForm.alertOnOffline,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/node/${nodeId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-foreground">Node Configuration</h2>
          <p className="text-sm text-muted-foreground">
            {nodeLoading ? "Loading…" : node?.name ?? nodeId}
          </p>
        </div>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alerts
          </CardTitle>
          <CardDescription>
            Receive Telegram notifications when metrics exceed thresholds or the node goes offline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Telegram credentials */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Telegram</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tg-bot-token">Bot Token</Label>
                    <Input
                      id="tg-bot-token"
                      type="password"
                      placeholder="1234567890:AABBccDDeeFFggHHii..."
                      value={alertForm.telegramBotToken}
                      onChange={(e) => setAlertForm((f) => ({ ...f, telegramBotToken: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tg-chat-id">Chat ID</Label>
                    <Input
                      id="tg-chat-id"
                      placeholder="-100123456789"
                      value={alertForm.telegramChatId}
                      onChange={(e) => setAlertForm((f) => ({ ...f, telegramChatId: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Metric thresholds */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">
                  Thresholds{" "}
                  <span className="text-muted-foreground font-normal">(0–100 %, leave empty to disable)</span>
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {(
                    [
                      { id: "cpu", label: "CPU %", key: "cpuThreshold" },
                      { id: "ram", label: "RAM %", key: "ramThreshold" },
                      { id: "disk", label: "Disk %", key: "diskThreshold" },
                    ] as const
                  ).map(({ id, label, key }) => (
                    <div key={id} className="space-y-2">
                      <Label htmlFor={`threshold-${id}`}>{label}</Label>
                      <Input
                        id={`threshold-${id}`}
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        placeholder="e.g. 85"
                        value={alertForm[key]}
                        onChange={(e) => setAlertForm((f) => ({ ...f, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Offline alert toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="alert-offline" className="text-sm font-medium">
                    Alert when node goes offline
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    A Telegram message is sent 30 s after the node loses its connection.
                  </p>
                </div>
                <Switch
                  id="alert-offline"
                  checked={alertForm.alertOnOffline}
                  onCheckedChange={(v) => setAlertForm((f) => ({ ...f, alertOnOffline: v }))}
                />
              </div>

              {alertsError && <p className="text-sm text-destructive">{alertsError}</p>}

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveAlerts} disabled={alertsSaving} className="gap-2">
                  {alertsSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : alertsSaved ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {alertsSaving ? "Saving…" : alertsSaved ? "Saved!" : "Save Alerts"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rename */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Rename node
          </CardTitle>
          <CardDescription>Change the display name for this node.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 max-w-md">
            <Input
              value={renameValue}
              onChange={(e) => { setRenameValue(e.target.value); setRenameSaved(false) }}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              disabled={renameLoading || nodeLoading}
              placeholder="Node name"
            />
            <Button onClick={handleRename} disabled={renameLoading || nodeLoading} className="shrink-0 gap-2">
              {renameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : renameSaved ? <Check className="h-4 w-4" /> : null}
              {renameLoading ? "Saving…" : renameSaved ? "Saved!" : "Rename"}
            </Button>
          </div>
          {renameError && <p className="mt-2 text-sm text-destructive">{renameError}</p>}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 gap-4">
            <div>
              <p className="text-sm font-medium">Delete this node</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All node tokens will be revoked and all associated data will be permanently deleted.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete node
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open: boolean) => { setShowDeleteDialog(open); if (!open) setDeleteError(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este nodo?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Estás a punto de eliminar permanentemente el nodo{" "}
                  <strong className="text-foreground">{node?.hostname || node?.name}</strong>.
                </p>
                <p>
                  Se revocarán todos los tokens y se eliminará toda la información asociada.{" "}
                  Esta acción no se puede deshacer.
                </p>
                {deleteError && (
                  <div className="text-destructive rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2">
                    {deleteError}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end mt-2">
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando...</>
              ) : (
                "Eliminar nodo"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
