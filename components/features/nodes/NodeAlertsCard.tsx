"use client"

import { useState } from "react"
import { Bell, Check, Loader2, Send, Plus, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useNodeAlerts } from "@/lib/features/nodes/config/hooks/useNodeAlerts"
import { useTelegramBots } from "@/lib/features/telegram-bots/hooks/useTelegramBots"
import { TelegramBotDialog } from "@/components/features/settings/TelegramBotDialog"
import Link from "next/link"
import type { CreateTelegramBotInput } from "@/lib/features/telegram-bots/types"

interface NodeAlertsCardProps {
  nodeId: string
}

export function NodeAlertsCard({ nodeId }: NodeAlertsCardProps) {
  const {
    config: alertConfig,
    isLoading: isConfigLoading,
    isSaving,
    saved,
    error: configError,
    save,
  } = useNodeAlerts(nodeId)

  const {
    bots,
    isLoading: isBotsLoading,
    addBot,
    sendTest,
  } = useTelegramBots()

  const [form, setForm] = useState({
    telegramBotId: "" as string | null,
    telegramBotToken: "",
    telegramChatId: "",
    cpuThreshold: "" as string,
    ramThreshold: "" as string,
    diskThreshold: "" as string,
    alertOnOffline: false,
  })
  const [synced, setSynced] = useState(false)
  const [selectedMode, setSelectedMode] = useState<string>("none") // "none" | "custom" | botId
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)

  if (!isConfigLoading && !synced) {
    setSynced(true)
    const initialBotId = alertConfig.telegramBotId || null
    let mode = "none"
    if (initialBotId) {
      mode = initialBotId
    } else if (alertConfig.telegramBotToken || alertConfig.telegramChatId) {
      mode = "custom"
    }

    setSelectedMode(mode)
    setForm({
      telegramBotId: initialBotId,
      telegramBotToken: alertConfig.telegramBotToken ?? "",
      telegramChatId: alertConfig.telegramChatId ?? "",
      cpuThreshold: alertConfig.cpuThreshold != null ? String(alertConfig.cpuThreshold) : "",
      ramThreshold: alertConfig.ramThreshold != null ? String(alertConfig.ramThreshold) : "",
      diskThreshold: alertConfig.diskThreshold != null ? String(alertConfig.diskThreshold) : "",
      alertOnOffline: alertConfig.alertOnOffline ?? false,
    })
  }

  const handleModeChange = (val: string) => {
    setSelectedMode(val)
    if (val === "none") {
      setForm((f) => ({ ...f, telegramBotId: null, telegramBotToken: "", telegramChatId: "" }))
    } else if (val === "custom") {
      setForm((f) => ({ ...f, telegramBotId: null }))
    } else {
      // It's a bot ID
      const found = bots.find((b) => b.id === val)
      if (found) {
        setForm((f) => ({
          ...f,
          telegramBotId: found.id,
          telegramBotToken: found.bot_token,
          telegramChatId: found.chat_id,
        }))
      } else {
        setForm((f) => ({ ...f, telegramBotId: val }))
      }
    }
  }

  const handleAddBot = async (input: CreateTelegramBotInput) => {
    const res = await addBot(input)
    if (res.success && res.bot) {
      handleModeChange(res.bot.id)
    }
    return res
  }

  const handleTestConnection = async () => {
    let token = form.telegramBotToken
    let chatId = form.telegramChatId

    if (selectedMode !== "none" && selectedMode !== "custom") {
      const selectedBot = bots.find((b) => b.id === selectedMode)
      if (selectedBot) {
        token = selectedBot.bot_token
        chatId = selectedBot.chat_id
      }
    }

    if (!token || !chatId) {
      setTestResult({ success: false, msg: "Missing bot token or chat ID" })
      return
    }

    setIsTesting(true)
    setTestResult(null)
    const res = await sendTest({ bot_token: token, chat_id: chatId })
    setIsTesting(false)
    if (res.success) {
      setTestResult({ success: true, msg: "Test message sent to Telegram!" })
    } else {
      setTestResult({ success: false, msg: res.error || "Failed to send test message" })
    }
    setTimeout(() => setTestResult(null), 5000)
  }

  const handleSave = async () => {
    const parseThreshold = (v: string) => {
      const n = parseFloat(v)
      return isNaN(n) ? null : Math.min(100, Math.max(0, n))
    }

    let botIdToSave = form.telegramBotId
    if (selectedMode === "none") {
      botIdToSave = null
    } else if (selectedMode !== "custom") {
      botIdToSave = selectedMode
    } else {
      botIdToSave = null
    }

    await save({
      telegramBotId: botIdToSave,
      telegramBotToken: selectedMode === "custom" ? form.telegramBotToken : "",
      telegramChatId: selectedMode === "custom" ? form.telegramChatId : "",
      cpuThreshold: parseThreshold(form.cpuThreshold),
      ramThreshold: parseThreshold(form.ramThreshold),
      diskThreshold: parseThreshold(form.diskThreshold),
      alertOnOffline: form.alertOnOffline,
    })
  }

  const selectedBot = bots.find((b) => b.id === selectedMode)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Alerts
        </CardTitle>
        <CardDescription>
          Receive Telegram notifications when metrics exceed thresholds or the node goes offline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConfigLoading || isBotsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Telegram Bot Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Telegram Bot</p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Bot
                  </Button>
                  <Link
                    href="/settings"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Manage Bots <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                <Select value={selectedMode} onValueChange={handleModeChange}>
                  <SelectTrigger className="w-full sm:w-[320px]">
                    <SelectValue placeholder="Select a Telegram Bot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Disabled (No Telegram Bot)</SelectItem>
                    {bots.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        🤖 {b.name} ({b.chat_id})
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">✏️ Custom Bot Token & Chat ID</SelectItem>
                  </SelectContent>
                </Select>

                {/* Show selected bot summary */}
                {selectedBot && (
                  <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{selectedBot.name}</p>
                      <p className="text-muted-foreground font-mono">Chat ID: {selectedBot.chat_id}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Test
                    </Button>
                  </div>
                )}

                {/* Show custom form if selectedMode === 'custom' */}
                {selectedMode === "custom" && (
                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="tg-bot-token">Bot Token</Label>
                      <Input
                        id="tg-bot-token"
                        type="password"
                        placeholder="1234567890:AABBccDDeeFFggHHii..."
                        value={form.telegramBotToken}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, telegramBotToken: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tg-chat-id">Chat ID</Label>
                      <Input
                        id="tg-chat-id"
                        placeholder="-100123456789"
                        value={form.telegramChatId}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, telegramChatId: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                )}

                {testResult && (
                  <p
                    className={`text-xs ${
                      testResult.success ? "text-green-600 dark:text-green-400" : "text-destructive"
                    }`}
                  >
                    {testResult.msg}
                  </p>
                )}
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

            {configError && <p className="text-sm text-destructive">{configError}</p>}

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

      <TelegramBotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleAddBot}
        onTest={sendTest}
      />
    </Card>
  )
}
