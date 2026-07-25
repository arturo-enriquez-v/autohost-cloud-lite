"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react"
import type { TelegramBot, CreateTelegramBotInput } from "@/lib/features/telegram-bots/types"

interface TelegramBotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bot?: TelegramBot | null
  onSave: (input: CreateTelegramBotInput) => Promise<{ success: boolean; error?: string }>
  onTest: (data: { bot_token: string; chat_id: string }) => Promise<{ success: boolean; error?: string }>
}

export function TelegramBotDialog({
  open,
  onOpenChange,
  bot,
  onSave,
  onTest,
}: TelegramBotDialogProps) {
  const [name, setName] = useState("")
  const [botToken, setBotToken] = useState("")
  const [chatId, setChatId] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (bot) {
      setName(bot.name)
      setBotToken(bot.bot_token)
      setChatId(bot.chat_id)
    } else {
      setName("")
      setBotToken("")
      setChatId("")
    }
    setError(null)
    setTestSuccess(false)
  }, [bot, open])

  const handleTest = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      setError("Please fill in Bot Token and Chat ID to test")
      return
    }
    setIsTesting(true)
    setError(null)
    setTestSuccess(false)

    const res = await onTest({ bot_token: botToken.trim(), chat_id: chatId.trim() })
    setIsTesting(false)
    if (res.success) {
      setTestSuccess(true)
      setTimeout(() => setTestSuccess(false), 4000)
    } else {
      setError(res.error || "Failed to send test message")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !botToken.trim() || !chatId.trim()) {
      setError("All fields are required")
      return
    }
    setIsSaving(true)
    setError(null)

    const res = await onSave({
      name: name.trim(),
      bot_token: botToken.trim(),
      chat_id: chatId.trim(),
    })
    setIsSaving(false)

    if (res.success) {
      onOpenChange(false)
    } else {
      setError(res.error || "Failed to save Telegram Bot")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{bot ? "Edit Telegram Bot" : "Add Telegram Bot"}</DialogTitle>
            <DialogDescription>
              Save Telegram bot credentials to use across all your server nodes for alerts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {testSuccess && (
              <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Test message sent! Check your Telegram chat.</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bot-name">Bot Name / Profile</Label>
              <Input
                id="bot-name"
                placeholder="e.g. Production Alerts, DevOps Chat"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bot-token">Bot Token</Label>
              <Input
                id="bot-token"
                type="password"
                placeholder="1234567890:AAFF..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bot-chat-id">Chat ID</Label>
              <Input
                id="bot-chat-id"
                placeholder="e.g. -100123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                required
              />
            </div>

            <div className="pt-1 flex justify-start">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={handleTest}
                disabled={isTesting || !botToken || !chatId}
              >
                {isTesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {isTesting ? "Sending Test..." : "Test Connection"}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bot ? "Save Changes" : "Create Bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
