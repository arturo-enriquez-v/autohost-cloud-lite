"use client"

import { useState } from "react"
import { Bell, Check, Loader2, Send } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useNodeAlerts } from "../hooks"

interface NodeAlertsCardProps {
  nodeId: string
}

export function NodeAlertsCard({ nodeId }: NodeAlertsCardProps) {
  const {
    config: alertConfig,
    isLoading,
    isSaving,
    saved,
    error,
    save,
  } = useNodeAlerts(nodeId)

  const [form, setForm] = useState({
    telegramBotToken: "",
    telegramChatId: "",
    cpuThreshold: "" as string,
    ramThreshold: "" as string,
    diskThreshold: "" as string,
    alertOnOffline: false,
  })
  const [synced, setSynced] = useState(false)

  if (!isLoading && !synced) {
    setSynced(true)
    setForm({
      telegramBotToken: alertConfig.telegramBotToken ?? "",
      telegramChatId: alertConfig.telegramChatId ?? "",
      cpuThreshold: alertConfig.cpuThreshold != null ? String(alertConfig.cpuThreshold) : "",
      ramThreshold: alertConfig.ramThreshold != null ? String(alertConfig.ramThreshold) : "",
      diskThreshold: alertConfig.diskThreshold != null ? String(alertConfig.diskThreshold) : "",
      alertOnOffline: alertConfig.alertOnOffline ?? false,
    })
  }

  const handleSave = async () => {
    const parseThreshold = (v: string) => {
      const n = parseFloat(v)
      return isNaN(n) ? null : Math.min(100, Math.max(0, n))
    }
    await save({
      telegramBotToken: form.telegramBotToken,
      telegramChatId: form.telegramChatId,
      cpuThreshold: parseThreshold(form.cpuThreshold),
      ramThreshold: parseThreshold(form.ramThreshold),
      diskThreshold: parseThreshold(form.diskThreshold),
      alertOnOffline: form.alertOnOffline,
    })
  }

  return (
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
        {isLoading ? (
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
                    value={form.telegramBotToken}
                    onChange={(e) => setForm((f) => ({ ...f, telegramBotToken: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tg-chat-id">Chat ID</Label>
                  <Input
                    id="tg-chat-id"
                    placeholder="-100123456789"
                    value={form.telegramChatId}
                    onChange={(e) => setForm((f) => ({ ...f, telegramChatId: e.target.value }))}
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
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
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
                checked={form.alertOnOffline}
                onCheckedChange={(v) => setForm((f) => ({ ...f, alertOnOffline: v }))}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isSaving ? "Saving…" : saved ? "Saved!" : "Save Alerts"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
