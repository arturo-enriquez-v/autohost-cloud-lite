// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Send, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { ConnectorsService } from "@/lib/features/connectors/services/connectors.service"
import {
  applyMapping,
  placeholdersIn,
  relativeToRoot,
  parsePath,
  extract,
} from "@/lib/features/connectors/mapping"
import type {
  Connector,
  ConnectorAuthType,
  ConnectorBodyType,
  ConnectorDefinition,
  ConnectorInput,
  ConnectorMethod,
  ConnectorParam,
  ConnectorParamType,
  ConnectorResult,
  ConnectorView,
} from "@/lib/features/connectors/interfaces/connector"
import type { Project } from "@/lib/types"
import { ConnectorResultView, RawBody, ResultStatus } from "./ConnectorResultView"
import { JsonPathPicker } from "./JsonPathPicker"
import { defaultParamValues, ParamInputs, toParamValues } from "./ParamInputs"

const METHODS: ConnectorMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]
const textareaClass =
  "w-full min-h-28 rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"

type SecretMode = "keep" | "replace" | "clear"

function emptyDefinition(projectId: string): ConnectorDefinition {
  return {
    project_id: projectId,
    name: "",
    description: "",
    kind: "query",
    method: "GET",
    url: "",
    headers: [],
    body_type: "none",
    body: "",
    params: [],
    auth: { type: "none" },
    response: { root: "", fields: [], view: "table" },
    cache_ttl_seconds: 30,
    timeout_seconds: 15,
  }
}

function fromConnector(c: Connector): ConnectorDefinition {
  return {
    project_id: c.project_id,
    name: c.name,
    description: c.description ?? "",
    kind: c.kind,
    method: c.method,
    url: c.url,
    headers: (c.headers ?? []).map((h) => ({ ...h })),
    body_type: c.body_type ?? "none",
    body: c.body ?? "",
    params: (c.params ?? []).map((p) => ({ ...p })),
    auth: { ...c.auth },
    response: { root: c.response?.root ?? "", fields: (c.response?.fields ?? []).map((f) => ({ ...f })), view: c.response?.view ?? "json" },
    cache_ttl_seconds: c.cache_ttl_seconds ?? 0,
    timeout_seconds: c.timeout_seconds || 15,
  }
}

function urlOrigin(url: string): string {
  const m = /^([a-z]+):\/\/([^/?#]*)/i.exec(url.trim())
  return m ? `${m[1]}://${m[2]}`.toLowerCase() : ""
}

interface EditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Connector being edited; null to create one. */
  connector: Connector | null
  /** Projects the user can pick when creating (ignored when projectId is set). */
  projects: Project[]
  /** Fixed project (project page). */
  projectId?: string
  onSave: (input: ConnectorInput, id?: string) => Promise<unknown>
}

export function ConnectorEditorDialog({ open, onOpenChange, connector, projects, projectId, onSave }: EditorProps) {
  const editing = !!connector
  const [def, setDef] = useState<ConnectorDefinition>(() => emptyDefinition(projectId ?? ""))
  const [secretMode, setSecretMode] = useState<SecretMode>("replace")
  const [secret, setSecret] = useState("")
  const [tab, setTab] = useState("request")
  const [testValues, setTestValues] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<ConnectorResult | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Reset the form every time the dialog opens.
  useEffect(() => {
    if (!open) return
    const d = connector ? fromConnector(connector) : emptyDefinition(projectId ?? (projects.length === 1 ? projects[0].id : ""))
    setDef(d)
    setSecretMode(connector?.has_secret ? "keep" : "replace")
    setSecret("")
    setTab("request")
    setTestValues(defaultParamValues(d.params))
    setTestResult(null)
    setTestError(null)
    setSaveError(null)
  }, [open, connector, projectId, projects])

  const patch = (p: Partial<ConnectorDefinition>) => setDef((d) => ({ ...d, ...p }))
  const patchResponse = (p: Partial<ConnectorDefinition["response"]>) =>
    setDef((d) => ({ ...d, response: { ...d.response, ...p } }))
  const patchParam = (i: number, p: Partial<ConnectorParam>) =>
    setDef((d) => ({ ...d, params: d.params.map((x, j) => (j === i ? { ...x, ...p } : x)) }))

  const originChanged = editing && connector!.has_secret && urlOrigin(def.url) !== urlOrigin(connector!.url)
  const usedPlaceholders = useMemo(
    () => placeholdersIn([def.url, def.body, ...def.headers.map((h) => h.value)].join("\n")),
    [def.url, def.body, def.headers]
  )
  const undeclared = usedPlaceholders.filter((n) => !def.params.some((p) => p.name === n))

  const buildInput = (): ConnectorInput => {
    const input: ConnectorInput = { ...def }
    if (def.auth.type === "none") return input
    if (secretMode === "replace" && secret) input.secret = secret
    if (secretMode === "clear") input.secret = ""
    return input
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(buildInput(), connector?.id)
      onOpenChange(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save connector")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestError(null)
    try {
      const input = buildInput()
      const res = await ConnectorsService.test({
        connector: input,
        connector_id: editing && input.secret === undefined ? connector!.id : undefined,
        params: toParamValues(def.params, testValues),
      })
      setTestResult(res)
    } catch (e) {
      setTestResult(null)
      setTestError(e instanceof Error ? e.message : "Test failed")
    } finally {
      setTesting(false)
    }
  }

  // Live preview of the mapping over the last test response.
  const rootInfo = useMemo(() => {
    if (!testResult || testResult.body === undefined || typeof testResult.body === "string") return null
    try {
      const root = def.response.root ? extract(testResult.body, parsePath(def.response.root)) : testResult.body
      return { isList: Array.isArray(root) }
    } catch {
      return null
    }
  }, [testResult, def.response.root])

  const preview = useMemo(() => {
    if (!testResult || testResult.body === undefined || typeof testResult.body === "string") return null
    try {
      const mapped = applyMapping(testResult.body, def.response)
      return { result: { ...testResult, mapped: mapped ?? undefined, mapping_error: undefined }, error: null }
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : "Invalid path" }
    }
  }, [testResult, def.response])

  const addField = (absPath: string, key: string) => {
    const rel = relativeToRoot(def.response.root ?? "", absPath, rootInfo?.isList ?? false)
    if (!rel) return
    const fields = def.response.fields ?? []
    if (fields.some((f) => f.path === rel)) return
    const label = key.startsWith("[") ? rel : key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
    patchResponse({ fields: [...fields, { label, path: rel }], view: def.response.view === "json" ? "table" : def.response.view })
  }

  const canSave = def.name.trim() !== "" && def.url.trim() !== "" && def.project_id !== ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>{editing ? `Edit ${connector!.name}` : "New connector"}</DialogTitle>
          <DialogDescription>
            A saved request to an external API. Members of the project can use it from the panel; the
            credentials stay on the server.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 self-start">
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="auth">Auth</TabsTrigger>
            <TabsTrigger value="params">
              Params{def.params.length > 0 && ` (${def.params.length})`}
              {undeclared.length > 0 && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-500" />}
            </TabsTrigger>
            <TabsTrigger value="response">Test &amp; response</TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {/* ── Request ─────────────────────────────────────────────── */}
            <TabsContent value="request" className="mt-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="conn-name">Name</Label>
                  <Input id="conn-name" value={def.name} maxLength={100} onChange={(e) => patch({ name: e.target.value })} placeholder="Open issues" />
                </div>
                <div className="space-y-1">
                  <Label>Project</Label>
                  {editing || projectId ? (
                    <Input disabled value={projects.find((p) => p.id === def.project_id)?.name ?? "This project"} />
                  ) : (
                    <Select value={def.project_id} onValueChange={(v) => patch({ project_id: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="conn-desc">Description</Label>
                <Input id="conn-desc" value={def.description} maxLength={500} onChange={(e) => patch({ description: e.target.value })} />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {(["query", "action"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => patch({ kind: k, method: k === "action" && def.method === "GET" ? "POST" : def.method })}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      def.kind === k ? "border-[#70AEFF] bg-[#70AEFF]/10" : "hover:bg-accent"
                    )}
                  >
                    <p className="text-sm font-medium">{k === "query" ? "Query" : "Action"}</p>
                    <p className="text-xs text-muted-foreground">
                      {k === "query"
                        ? "Reads data and shows it as a widget. Viewers can use it; results can be cached."
                        : "Triggers a change (restart, create, delete). Needs run permission; every run is recorded."}
                    </p>
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <Label htmlFor="conn-url">URL</Label>
                <div className="flex gap-2">
                  <Select value={def.method} onValueChange={(v) => patch({ method: v as ConnectorMethod })}>
                    <SelectTrigger className="w-28 font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m} value={m} className="font-mono">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="conn-url"
                    className="font-mono text-xs"
                    value={def.url}
                    onChange={(e) => patch({ url: e.target.value })}
                    placeholder="https://api.example.com/v1/items/{{id}}?limit={{limit}}"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use <code>{"{{param}}"}</code> in the path or query; the host is fixed. Private addresses are
                  blocked unless the server allows them.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Headers</Label>
                  <Button type="button" size="sm" variant="ghost" onClick={() => patch({ headers: [...def.headers, { name: "", value: "" }] })}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add header
                  </Button>
                </div>
                {def.headers.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      className="w-48 font-mono text-xs"
                      placeholder="Accept"
                      value={h.name}
                      onChange={(e) => patch({ headers: def.headers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                    />
                    <Input
                      className="font-mono text-xs"
                      placeholder="application/json"
                      value={h.value}
                      onChange={(e) => patch({ headers: def.headers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })}
                    />
                    <Button type="button" size="icon" variant="ghost" onClick={() => patch({ headers: def.headers.filter((_, j) => j !== i) })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {def.headers.length > 0 && (
                  <p className="text-xs text-muted-foreground">Put tokens in the Auth tab, not here: header values are visible to editors.</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Body</Label>
                <Select value={def.body_type} onValueChange={(v) => patch({ body_type: v as ConnectorBodyType })}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No body</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="form">Form (urlencoded)</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
                {def.body_type !== "none" && (
                  <>
                    <textarea
                      className={textareaClass}
                      value={def.body}
                      onChange={(e) => patch({ body: e.target.value })}
                      placeholder={def.body_type === "json" ? '{"name": "{{name}}", "count": {{count}}}' : "a={{a}}&b={{b}}"}
                    />
                    {def.body_type === "json" && (
                      <p className="text-xs text-muted-foreground">
                        Write text params between quotes (<code>{'"{{name}}"'}</code>) and numbers or booleans without them.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {def.kind === "query" && (
                  <div className="space-y-1">
                    <Label htmlFor="conn-cache">Cache (seconds)</Label>
                    <Input
                      id="conn-cache"
                      type="number"
                      min={0}
                      max={3600}
                      value={def.cache_ttl_seconds}
                      onChange={(e) => patch({ cache_ttl_seconds: Number(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">Shared by everyone viewing the widget. 0 = no cache.</p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="conn-timeout">Timeout (seconds)</Label>
                  <Input
                    id="conn-timeout"
                    type="number"
                    min={1}
                    max={30}
                    value={def.timeout_seconds}
                    onChange={(e) => patch({ timeout_seconds: Number(e.target.value) || 15 })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── Auth ────────────────────────────────────────────────── */}
            <TabsContent value="auth" className="mt-0 space-y-4">
              <div className="space-y-1">
                <Label>Authentication</Label>
                <Select value={def.auth.type} onValueChange={(v) => patch({ auth: { type: v as ConnectorAuthType, in: "header" } })}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="bearer">Bearer token</SelectItem>
                    <SelectItem value="api_key">API key</SelectItem>
                    <SelectItem value="basic">Basic (user and password)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {def.auth.type === "api_key" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="conn-key-name">{def.auth.in === "query" ? "Query parameter" : "Header name"}</Label>
                    <Input
                      id="conn-key-name"
                      className="font-mono text-xs"
                      value={def.auth.name ?? ""}
                      placeholder={def.auth.in === "query" ? "api_key" : "X-API-Key"}
                      onChange={(e) => patch({ auth: { ...def.auth, name: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Send in</Label>
                    <Select value={def.auth.in ?? "header"} onValueChange={(v) => patch({ auth: { ...def.auth, in: v as "header" | "query" } })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="header">Header</SelectItem>
                        <SelectItem value="query">Query string</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {def.auth.type === "basic" && (
                <div className="space-y-1">
                  <Label htmlFor="conn-user">Username</Label>
                  <Input id="conn-user" value={def.auth.username ?? ""} onChange={(e) => patch({ auth: { ...def.auth, username: e.target.value } })} />
                </div>
              )}

              {def.auth.type !== "none" && (
                <div className="space-y-2 rounded-lg border p-4">
                  <Label htmlFor="conn-secret">{def.auth.type === "basic" ? "Password" : def.auth.type === "api_key" ? "API key" : "Token"}</Label>
                  {editing && connector!.has_secret && (
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["keep", "Keep the stored one"],
                          ["replace", "Replace"],
                          ["clear", "Remove"],
                        ] as const
                      ).map(([mode, label]) => (
                        <Button
                          key={mode}
                          type="button"
                          size="sm"
                          variant={secretMode === mode ? "default" : "outline"}
                          onClick={() => setSecretMode(mode)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  )}
                  {secretMode === "replace" && (
                    <Input
                      id="conn-secret"
                      type="password"
                      autoComplete="new-password"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      placeholder={editing && connector!.has_secret ? "New value" : "Paste the value"}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Stored encrypted on the server and never shown again, not even to you. Members who can run
                    the connector use it without seeing it.
                  </p>
                  {originChanged && secretMode === "keep" && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      The URL now points to another host: enter the credentials again to save or test it.
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ── Params ──────────────────────────────────────────────── */}
            <TabsContent value="params" className="mt-0 space-y-3">
              <p className="text-sm text-muted-foreground">
                Values filled in when the connector runs, used as <code>{"{{name}}"}</code> in the URL, headers or body.
              </p>
              {undeclared.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
                  <span>Used but not declared: {undeclared.map((n) => `{{${n}}}`).join(", ")}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => patch({ params: [...def.params, ...undeclared.map((name) => ({ name, type: "string" as const, required: true }))] })}
                  >
                    Add them
                  </Button>
                </div>
              )}
              {def.params.map((p, i) => (
                <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_8rem_1fr_auto]">
                  <Input className="font-mono text-xs" placeholder="name" value={p.name} onChange={(e) => patchParam(i, { name: e.target.value })} />
                  <Input placeholder="Label" value={p.label ?? ""} onChange={(e) => patchParam(i, { label: e.target.value })} />
                  <Select value={p.type} onValueChange={(v) => patchParam(i, { type: v as ConnectorParamType })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Default" value={p.default ?? ""} onChange={(e) => patchParam(i, { default: e.target.value })} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => setDef((d) => ({ ...d, params: d.params.filter((_, j) => j !== i) }))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-wrap items-center gap-4 text-xs sm:col-span-5">
                    <label className="flex items-center gap-2">
                      <Switch checked={!!p.required} onCheckedChange={(c) => patchParam(i, { required: c })} /> Required
                    </label>
                    <label className="flex items-center gap-2">
                      <Switch checked={!!p.sensitive} onCheckedChange={(c) => patchParam(i, { sensitive: c })} /> Hide in history
                    </label>
                    {!usedPlaceholders.includes(p.name) && p.name && <span className="text-muted-foreground">Not used yet</span>}
                  </div>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => patch({ params: [...def.params, { name: "", type: "string" }] })}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add param
              </Button>
            </TabsContent>

            {/* ── Test & response ─────────────────────────────────────── */}
            <TabsContent value="response" className="mt-0 space-y-4">
              <div className="space-y-3 rounded-lg border p-4">
                <ParamInputs params={def.params.filter((p) => p.name)} values={testValues} onChange={setTestValues} idPrefix="conn-test" />
                <div className="flex items-center gap-3">
                  <Button type="button" size="sm" onClick={handleTest} disabled={testing || !def.url || !def.project_id}>
                    {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send test request
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {def.kind === "action" ? "This really runs the action." : "Not cached or recorded."}
                  </span>
                </div>
                {testError && <p className="text-sm text-destructive">{testError}</p>}
                {testResult && (
                  <div className="space-y-2">
                    <ResultStatus result={testResult} />
                    {testResult.body !== undefined && typeof testResult.body !== "string" ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Pick a list with <b>use as rows</b> and the values to show with <b>column</b>.
                        </p>
                        <JsonPathPicker
                          value={testResult.body}
                          onPickRoot={(path) => patchResponse({ root: path, fields: [], view: "table" })}
                          onPickField={addField}
                          canPickField={(path) => relativeToRoot(def.response.root ?? "", path, rootInfo?.isList ?? false) !== null}
                        />
                      </>
                    ) : (
                      <RawBody body={testResult.body} />
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                  <div className="space-y-1">
                    <Label htmlFor="conn-root">Rows from</Label>
                    <Input
                      id="conn-root"
                      className="font-mono text-xs"
                      value={def.response.root ?? ""}
                      onChange={(e) => patchResponse({ root: e.target.value })}
                      placeholder="data.items (empty = the whole response)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Show as</Label>
                    <Select value={def.response.view ?? "json"} onValueChange={(v) => patchResponse({ view: v as ConnectorView })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="table">Table</SelectItem>
                        <SelectItem value="list">List</SelectItem>
                        <SelectItem value="value">Single value</SelectItem>
                        <SelectItem value="json">Raw JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Columns</Label>
                  {(def.response.fields ?? []).map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        className="w-48"
                        value={f.label}
                        placeholder="Label"
                        onChange={(e) => patchResponse({ fields: def.response.fields!.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                      />
                      <Input
                        className="font-mono text-xs"
                        value={f.path}
                        placeholder="user.name"
                        onChange={(e) => patchResponse({ fields: def.response.fields!.map((x, j) => (j === i ? { ...x, path: e.target.value } : x)) })}
                      />
                      <Button type="button" size="icon" variant="ghost" onClick={() => patchResponse({ fields: def.response.fields!.filter((_, j) => j !== i) })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => patchResponse({ fields: [...(def.response.fields ?? []), { label: "", path: "" }] })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add column
                  </Button>
                </div>
                {preview?.error && <p className="text-xs text-destructive">{preview.error}</p>}
                {preview?.result && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
                    <ConnectorResultView result={preview.result} view={def.response.view} />
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
          {saveError && <p className="mr-auto text-sm text-destructive">{saveError}</p>}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "Save" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
