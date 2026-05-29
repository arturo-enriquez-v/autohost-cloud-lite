"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Check, Send, ExternalLink, Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useEnrollments } from "@/lib/features/enrollments/hooks/useEnrollments"

export default function SettingsPage() {
  const { generateToken, isLoading, error } = useEnrollments()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Node status report
  const [reportStatus, setReportStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [reportResult, setReportResult] = useState<{ nodes_total?: number; nodes_active?: number; nodes_alerts?: number } | null>(null)

  const triggerNodeStatusReport = async () => {
    setReportStatus("loading")
    setReportResult(null)
    try {
      const res = await fetch("/api/reports/node-status", { method: "POST", credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setReportStatus("success")
        setReportResult(data)
      } else {
        setReportStatus("error")
      }
    } catch {
      setReportStatus("error")
    }
  }

  const generateApiKey = async () => {
    const result = await generateToken()
    if (result.success && result.data) {
      setApiKey(result.data.token)
    }
  }

  const copyToClipboard = async () => {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your dashboard preferences</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>Manage your API keys and authentication</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-red-500">
                {error}
              </div>
            )}
            {apiKey ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="text"
                      value={apiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copy this token now. It won't be shown again after you reload the page.
                  </p>
                </div>
                <Button onClick={generateApiKey} disabled={isLoading}>
                  {isLoading ? "Generating..." : "Regenerate API Key"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Generate a new API key to enroll nodes with the AutoHost-CLI
                </p>
                <Button onClick={generateApiKey} disabled={isLoading}>
                  {isLoading ? "Generating..." : "Generate API Key"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Settings</CardTitle>
            <CardDescription>Configure how often data is refreshed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interval">Update Interval</Label>
              <Select defaultValue="10">
                <SelectTrigger id="interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Telegram Alerts
            </CardTitle>
            <CardDescription>
              Configure a Telegram bot to receive alerts per node. You can set thresholds (CPU, RAM, disk) and enable offline notifications from each node's detail page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-2">
              <p className="font-medium">How to get your Bot Token and Chat ID:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>
                  Open Telegram and start a chat with{" "}
                  <span className="font-mono text-foreground">@BotFather</span>.
                </li>
                <li>Send <span className="font-mono">/newbot</span> and follow the instructions to get your <b>Bot Token</b>.</li>
                <li>
                  Start a chat with your new bot (or add it to a group), then open{" "}
                  <span className="font-mono">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</span> to retrieve your <b>Chat ID</b>.
                </li>
              </ol>
              <a
                href="https://core.telegram.org/bots/tutorial"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline text-xs"
              >
                Telegram Bot docs <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Once you have your token and chat ID, go to a <b>node's detail page</b> and open the <b>Alerts</b> section to configure per-node thresholds.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Node Status Report
            </CardTitle>
            <CardDescription>
              Collect current node metrics and queue a status report email via Redis. Reports are sent automatically on a schedule; use the button below to trigger a test.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reportStatus === "success" && reportResult && (
              <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Report queued successfully</p>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    Nodes: {reportResult.nodes_total ?? "—"} total · {reportResult.nodes_active ?? "—"} active · {reportResult.nodes_alerts ?? "—"} alerts
                  </p>
                </div>
              </div>
            )}
            {reportStatus === "error" && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Failed to queue report. Check API connectivity and Redis.</span>
              </div>
            )}
            <Button
              onClick={triggerNodeStatusReport}
              disabled={reportStatus === "loading"}
              variant="outline"
            >
              {reportStatus === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Collecting metrics…
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline">Reset to Defaults</Button>
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  )
}
