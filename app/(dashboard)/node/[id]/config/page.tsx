"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Bell, Check, Loader2, Send } from "lucide-react"
import { useNode } from "@/lib/hooks/useNode"
import { useNodeAlerts } from "@/lib/hooks/useNodeAlerts"

export default function NodeConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()

  const { node, isLoading: nodeLoading } = useNode(nodeId)
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
    </div>
  )
}
