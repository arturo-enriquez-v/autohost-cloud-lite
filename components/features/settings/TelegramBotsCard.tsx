"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Send,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bot,
} from "lucide-react"
import { useTelegramBots } from "@/lib/features/telegram-bots/hooks/useTelegramBots"
import { TelegramBotDialog } from "./TelegramBotDialog"
import type { TelegramBot, CreateTelegramBotInput } from "@/lib/features/telegram-bots/types"

export function TelegramBotsCard() {
  const { bots, isLoading, error, addBot, editBot, removeBot, sendTest } = useTelegramBots()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedBot, setSelectedBot] = useState<TelegramBot | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null)

  const handleOpenAdd = () => {
    setSelectedBot(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (bot: TelegramBot) => {
    setSelectedBot(bot)
    setDialogOpen(true)
  }

  const handleSave = async (input: CreateTelegramBotInput) => {
    if (selectedBot) {
      return await editBot(selectedBot.id, input)
    } else {
      return await addBot(input)
    }
  }

  const handleTestItem = async (bot: TelegramBot) => {
    setTestingId(bot.id)
    setTestResult(null)
    const res = await sendTest({ bot_token: bot.bot_token, chat_id: bot.chat_id })
    setTestingId(null)
    if (res.success) {
      setTestResult({ id: bot.id, success: true, msg: "Test message sent!" })
    } else {
      setTestResult({ id: bot.id, success: false, msg: res.error || "Failed to send test message" })
    }
    setTimeout(() => setTestResult(null), 5000)
  }

  const maskToken = (token: string) => {
    if (token.length <= 10) return "••••••••"
    return token.substring(0, 6) + "••••••••" + token.substring(token.length - 4)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Telegram Bots
          </CardTitle>
          <CardDescription>
            Configure Telegram bots to receive alerts per node without re-entering credentials.
          </CardDescription>
        </div>
        <Button onClick={handleOpenAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Bot
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : bots.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <Bot className="h-10 w-10 text-muted-foreground/60 mb-2" />
            <p className="font-medium text-sm text-foreground">No Telegram Bots configured</p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              Add a bot token and chat ID here so you can assign it to your nodes in one click.
            </p>
            <Button onClick={handleOpenAdd} variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Configure your first bot
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {bots.map((b) => (
              <div
                key={b.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{b.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                    <span>Chat ID: <strong className="text-foreground font-semibold">{b.chat_id}</strong></span>
                    <span>Token: {maskToken(b.bot_token)}</span>
                  </div>
                  {testResult && testResult.id === b.id && (
                    <div
                      className={`text-xs flex items-center gap-1 mt-1 ${
                        testResult.success
                          ? "text-green-600 dark:text-green-400"
                          : "text-destructive"
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                      <span>{testResult.msg}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => handleTestItem(b)}
                    disabled={testingId === b.id}
                  >
                    {testingId === b.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Test
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenEdit(b)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeBot(b.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-md border bg-muted/40 p-4 text-xs space-y-2">
          <p className="font-medium text-foreground">How to get your Bot Token and Chat ID:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>
              Open Telegram and start a chat with <span className="font-mono text-foreground">@BotFather</span>.
            </li>
            <li>Send <span className="font-mono text-foreground">/newbot</span> and follow instructions for your Bot Token.</li>
            <li>
              Start a chat with your bot, then check <span className="font-mono text-foreground">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</span> for your Chat ID.
            </li>
          </ol>
          <a
            href="https://core.telegram.org/bots/tutorial"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline text-xs pt-1"
          >
            Telegram Bot docs <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>

      <TelegramBotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bot={selectedBot}
        onSave={handleSave}
        onTest={sendTest}
      />
    </Card>
  )
}
