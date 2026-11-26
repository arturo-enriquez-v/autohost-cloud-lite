// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useCallback, useEffect, useState } from "react"
import { Bot, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { AssistantService } from "@/lib/features/assistant/services/assistant.service"
import { ASSISTANT_SETTINGS_CHANGED } from "@/lib/features/assistant/hooks/useAssistantStatus"
import type { AssistantSettings, AssistantSettingsInput } from "@/lib/features/assistant/interfaces/assistant"

type KeyMode = "keep" | "replace" | "clear"

/** Admin settings of the built-in assistant: provider, models and API key. */
export function AssistantSettingsCard() {
  const [loaded, setLoaded] = useState<AssistantSettings | null>(null)
  const [form, setForm] = useState<AssistantSettingsInput | null>(null)
  const [keyMode, setKeyMode] = useState<KeyMode>("keep")
  const [apiKey, setApiKey] = useState("")
  const [available, setAvailable] = useState<string[] | null>(null)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [loadingModels, setLoadingModels] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadModels = useCallback(async () => {
    setLoadingModels(true)
    setModelsError(null)
    try {
      setAvailable(await AssistantService.providerModels())
    } catch (e) {
      setAvailable(null)
      setModelsError(e instanceof Error ? e.message : "Could not reach the provider")
    } finally {
      setLoadingModels(false)
    }
  }, [])

  useEffect(() => {
    AssistantService.settings()
      .then((s) => {
        setLoaded(s)
        setForm({
          enabled: s.enabled,
          base_url: s.base_url,
          default_model: s.default_model,
          models: s.models ?? [],
          reasoning_effort: s.reasoning_effort ?? "",
        })
        setKeyMode(s.has_api_key ? "keep" : "replace")
        if (s.base_url) loadModels()
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load the settings"))
  }, [loadModels])

  if (!form) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <p className="text-sm text-destructive">{error}</p> : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </CardContent>
      </Card>
    )
  }

  const patch = (p: Partial<AssistantSettingsInput>) => setForm((f) => (f ? { ...f, ...p } : f))
  const toggleExtra = (m: string, on: boolean) =>
    patch({ models: on ? [...form.models, m] : form.models.filter((x) => x !== m) })

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const input: AssistantSettingsInput = { ...form }
      if (keyMode === "replace" && apiKey) input.api_key = apiKey
      if (keyMode === "clear") input.api_key = ""
      const saved = await AssistantService.saveSettings(input)
      setLoaded(saved)
      setApiKey("")
      setKeyMode(saved.has_api_key ? "keep" : "replace")
      toast.success("Assistant settings saved")
      window.dispatchEvent(new Event(ASSISTANT_SETTINGS_CHANGED))
      loadModels()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const modelChoices = Array.from(new Set([...(available ?? []), form.default_model, ...form.models].filter(Boolean)))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" /> Assistant
            </CardTitle>
            <CardDescription>
              Chat in the panel backed by a model of your choice (Ollama, llama.cpp, vLLM or any OpenAI-compatible API).
              It acts with each user&apos;s own permissions and asks before changing anything.
            </CardDescription>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loaded?.from_env && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Using ASSISTANT_* environment variables until these settings are saved.
          </p>
        )}
        <div className="space-y-1">
          <Label htmlFor="asst-url">API URL</Label>
          <div className="flex gap-2">
            <Input
              id="asst-url"
              className="font-mono text-xs"
              placeholder="http://localhost:11434/v1"
              value={form.base_url}
              onChange={(e) => patch({ base_url: e.target.value })}
            />
            <Button variant="outline" size="icon" title="Load models from the provider (save first)" onClick={loadModels} disabled={loadingModels || !loaded?.base_url}>
              {loadingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            For Ollama on a node, use its VPN or LAN address with <code>/v1</code>, e.g. <code>http://100.64.0.5:11434/v1</code>.
          </p>
          {modelsError && <p className="text-xs text-destructive">{modelsError}</p>}
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <Label htmlFor="asst-key">API key (optional)</Label>
          {loaded?.has_api_key && (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["keep", "Keep the stored one"],
                  ["replace", "Replace"],
                  ["clear", "Remove"],
                ] as const
              ).map(([mode, label]) => (
                <Button key={mode} type="button" size="sm" variant={keyMode === mode ? "default" : "outline"} onClick={() => setKeyMode(mode)}>
                  {label}
                </Button>
              ))}
            </div>
          )}
          {keyMode === "replace" && (
            <Input
              id="asst-key"
              type="password"
              autoComplete="new-password"
              placeholder="Only for hosted providers; Ollama needs none"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          )}
          <p className="text-xs text-muted-foreground">Stored encrypted and never shown again.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Default model</Label>
            {modelChoices.length > 0 ? (
              <Select value={form.default_model} onValueChange={(v) => patch({ default_model: v, models: form.models.filter((m) => m !== v) })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a model" />
                </SelectTrigger>
                <SelectContent>
                  {modelChoices.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input placeholder="qwen3:8b" value={form.default_model} onChange={(e) => patch({ default_model: e.target.value })} />
            )}
          </div>
          <div className="space-y-1">
            <Label>Thinking</Label>
            <Select value={form.reasoning_effort || "default"} onValueChange={(v) => patch({ reasoning_effort: (v === "default" ? "" : v) as AssistantSettingsInput["reasoning_effort"] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Model default</SelectItem>
                <SelectItem value="none">Off (faster)</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {modelChoices.filter((m) => m !== form.default_model).length > 0 && (
          <div className="space-y-2">
            <Label>Other models users can pick</Label>
            <div className="flex flex-wrap gap-3">
              {modelChoices
                .filter((m) => m !== form.default_model)
                .map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <Switch checked={form.models.includes(m)} onCheckedChange={(v) => toggleExtra(m, v)} />
                    <span className="font-mono text-xs">{m}</span>
                  </label>
                ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
