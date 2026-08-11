"use client"

import { useEffect, useState, useCallback } from "react"
import {
  FileText,
  Key,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  Info,
  Terminal,
  Flame,
  ShieldCheck,
  Code2,
  ExternalLink,
  Loader2,
  Server,
  Tag,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ExternalLog {
  id: string
  user_id: string
  node_id?: string
  token_id?: string
  title: string
  level: string
  message?: string
  tags: string[]
  metadata?: Record<string, unknown>
  created_at: string
}

interface ExternalLogToken {
  id: string
  user_id: string
  name: string
  token_prefix: string
  node_id?: string
  created_at: string
  last_seen_at?: string
  revoked_at?: string
}

interface NodeItem {
  id: string
  hostname: string
}

export default function ExternalLogsPage() {
  const [activeTab, setActiveTab] = useState<"logs" | "tokens" | "docs">("logs")
  
  // Data state
  const [logs, setLogs] = useState<ExternalLog[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [tokens, setTokens] = useState<ExternalLogToken[]>([])
  const [nodes, setNodes] = useState<NodeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filters
  const [search, setSearch] = useState("")
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  const [selectedNode, setSelectedNode] = useState<string>("all")

  // Token Modal
  const [createTokenOpen, setCreateTokenOpen] = useState(false)
  const [tokenName, setTokenName] = useState("")
  const [tokenNodeId, setTokenNodeId] = useState<string>("")
  const [creatingToken, setCreatingToken] = useState(false)
  const [rawTokenCreated, setRawTokenCreated] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState(false)

  // Expandable cards
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({})

  // Clear logs modal
  const [clearLogsOpen, setClearLogsOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.append("limit", "100")
      if (selectedLevel !== "all") params.append("level", selectedLevel)
      if (selectedNode !== "all") params.append("node_id", selectedNode)
      if (search.trim()) params.append("search", search.trim())

      const res = await fetch(`/api/external-logs?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotalLogs(data.total || 0)
      }
    } catch (e) {
      console.error("Failed to fetch external logs:", e)
    }
  }, [selectedLevel, selectedNode, search])

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/external-log-tokens")
      if (res.ok) {
        const data = await res.json()
        setTokens(data.tokens || [])
      }
    } catch (e) {
      console.error("Failed to fetch external log tokens:", e)
    }
  }, [])

  const fetchNodes = useCallback(async () => {
    try {
      const res = await fetch("/api/nodes")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setNodes(data.map((n: { id: string; hostname?: string }) => ({ id: n.id, hostname: n.hostname || n.id })))
        }
      }
    } catch (e) {
      console.error("Failed to fetch nodes:", e)
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchLogs(), fetchTokens(), fetchNodes()])
    setLoading(false)
  }, [fetchLogs, fetchTokens, fetchNodes])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchLogs(), fetchTokens()])
    setRefreshing(false)
  }

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await fetch(`/api/external-logs/${id}`, { method: "DELETE" })
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== id))
        setTotalLogs((t) => Math.max(0, t - 1))
      }
    } catch (e) {
      console.error("Failed to delete log:", e)
    }
  }

  const handleClearAllLogs = async () => {
    setClearing(true)
    try {
      const res = await fetch("/api/external-logs", { method: "DELETE" })
      if (res.ok) {
        setLogs([])
        setTotalLogs(0)
        setClearLogsOpen(false)
      }
    } catch (e) {
      console.error("Failed to clear logs:", e)
    } finally {
      setClearing(false)
    }
  }

  const handleCreateToken = async () => {
    if (!tokenName.trim()) return
    setCreatingToken(true)
    try {
      const res = await fetch("/api/external-log-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tokenName.trim(),
          node_id: tokenNodeId || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setRawTokenCreated(data.raw_token)
        setTokenName("")
        setTokenNodeId("")
        fetchTokens()
      }
    } catch (e) {
      console.error("Failed to create token:", e)
    } finally {
      setCreatingToken(false)
    }
  }

  const handleRevokeToken = async (id: string) => {
    try {
      const res = await fetch(`/api/external-log-tokens/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchTokens()
      }
    } catch (e) {
      console.error("Failed to revoke token:", e)
    }
  }

  const copyToClipboard = (text: string, isToken = false) => {
    navigator.clipboard.writeText(text)
    if (isToken) {
      setCopiedToken(true)
      setTimeout(() => setCopiedToken(false), 2000)
    } else {
      setCopiedSnippet(true)
      setTimeout(() => setCopiedSnippet(false), 2000)
    }
  }

  const getLevelBadge = (level: string) => {
    const l = level.toLowerCase()
    switch (l) {
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-400 border border-red-500/20">
            <AlertCircle className="h-3.5 w-3.5" />
            ERROR
          </span>
        )
      case "critical":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/30 animate-pulse">
            <Flame className="h-3.5 w-3.5" />
            CRITICAL
          </span>
        )
      case "warning":
      case "alerta":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-3.5 w-3.5" />
            WARNING
          </span>
        )
      case "debug":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/20">
            <Terminal className="h-3.5 w-3.5" />
            DEBUG
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
            <Info className="h-3.5 w-3.5" />
            INFO
          </span>
        )
    }
  }

  const getNodeName = (nodeId?: string) => {
    if (!nodeId) return "Global / Unlinked"
    const match = nodes.find((n) => n.id === nodeId)
    return match ? match.hostname : nodeId.substring(0, 8) + "..."
  }

  const activeTokenSample = tokens.find((t) => !t.revoked_at)
  const sampleTokenStr = rawTokenCreated || (activeTokenSample ? `${activeTokenSample.token_prefix}secret` : "ahl_sec_YOUR_SECRET_TOKEN")

  const curlSnippet = `curl -X POST https://api.autohst.dev/v1/external-logs/ingest \\
  -H "Authorization: Bearer ${sampleTokenStr}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Database Connection Timeout",
    "level": "error",
    "message": "Failed to connect to primary DB at 10.0.0.5:5432 after 3 retries",
    "tags": ["db", "postgres", "production"],
    "metadata": {
      "service": "billing-api",
      "retry_count": 3,
      "latency_ms": 5012
    }
  }'`

  const jsSnippet = `await fetch("https://api.autohst.dev/v1/external-logs/ingest", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${sampleTokenStr}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    title: "Order Processing Failed",
    level: "warning",
    message: "Stripe payment capture delayed",
    tags: ["payments", "stripe"],
    metadata: { order_id: "ord_99812", amount: 49.99 }
  })
});`

  const pythonSnippet = `import requests

url = "https://api.autohst.dev/v1/external-logs/ingest"
headers = {
    "Authorization": "Bearer ${sampleTokenStr}",
    "Content-Type": "application/json"
}
payload = {
    "title": "Celery Task Exception",
    "level": "critical",
    "message": "Worker out of memory",
    "tags": ["celery", "python", "backend"],
    "metadata": {"task_id": "8b9a2c", "queue": "high-priority"}
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#70AEFF]/10 text-[#70AEFF] border border-[#70AEFF]/20">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">External Logs</h1>
              <p className="text-sm text-muted-foreground">
                Ingest & visualize logs sent from external APIs, microservices, or custom scripts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-border hover:bg-[#70AEFF]/10 hover:text-[#70AEFF]"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateTokenOpen(true)}
            className="bg-[#70AEFF] text-black font-semibold hover:bg-[#70AEFF]/90 transition-all shadow-md shadow-[#70AEFF]/10"
          >
            <Key className="h-4 w-4 mr-2" />
            New Ingestion Token
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("logs")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all",
            activeTab === "logs"
              ? "border-[#70AEFF] text-[#70AEFF]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Layers className="h-4 w-4" />
          Logs Viewer ({totalLogs})
        </button>
        <button
          onClick={() => setActiveTab("tokens")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all",
            activeTab === "tokens"
              ? "border-[#70AEFF] text-[#70AEFF]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          API Tokens ({tokens.length})
        </button>
        <button
          onClick={() => setActiveTab("docs")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all",
            activeTab === "docs"
              ? "border-[#70AEFF] text-[#70AEFF]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Code2 className="h-4 w-4" />
          Integration Guide
        </button>
      </div>

      {/* TAB 1: LOGS VIEWER */}
      {activeTab === "logs" && (
        <div className="space-y-5">
          {/* Filters Bar */}
          <Card className="bg-card/50 border-border shadow-sm backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or message content..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-background/60 border-border focus:border-[#70AEFF]"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Level Select */}
                  <div className="flex items-center gap-1.5 bg-background/60 px-3 py-1.5 rounded-lg border border-border">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Level:</span>
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Levels</option>
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                      <option value="critical">Critical</option>
                      <option value="debug">Debug</option>
                    </select>
                  </div>

                  {/* Node Select */}
                  <div className="flex items-center gap-1.5 bg-background/60 px-3 py-1.5 rounded-lg border border-border">
                    <Server className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Node:</span>
                    <select
                      value={selectedNode}
                      onChange={(e) => setSelectedNode(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer max-w-[150px] truncate"
                    >
                      <option value="all">All Nodes</option>
                      <option value="unlinked">Global / Unlinked</option>
                      {nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.hostname}
                        </option>
                      ))}
                    </select>
                  </div>

                  {totalLogs > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClearLogsOpen(true)}
                      className="text-destructive hover:bg-destructive/10 border-destructive/20 ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Clear Logs
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#70AEFF] mb-3" />
              <p className="text-sm text-muted-foreground">Loading external logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <Card className="bg-card/30 border-dashed border-border py-12 text-center">
              <CardContent className="space-y-3">
                <div className="inline-flex p-3 rounded-full bg-[#70AEFF]/10 text-[#70AEFF] mb-1">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-foreground">No logs found</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  No external logs match your current filter criteria or none have been ingested yet.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("docs")}
                    className="border-[#70AEFF]/30 text-[#70AEFF] hover:bg-[#70AEFF]/10"
                  >
                    View Integration Snippets <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const isExpanded = !!expandedLogIds[log.id]
                const formattedDate = new Date(log.created_at).toLocaleString()

                return (
                  <Card
                    key={log.id}
                    className="bg-card/70 border-border hover:border-[#70AEFF]/40 transition-all shadow-sm group"
                  >
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5 shrink-0">{getLevelBadge(log.level)}</div>

                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate group-hover:text-[#70AEFF] transition-colors">
                              {log.title}
                            </h4>
                            {log.message && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 font-mono">
                                {log.message}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {/* Node pill */}
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                            <Server className="h-3 w-3 opacity-60" />
                            {getNodeName(log.node_id)}
                          </span>

                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {formattedDate}
                          </span>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleExpand(log.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLog(log.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Tags */}
                      {log.tags && log.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          <Tag className="h-3 w-3 text-muted-foreground opacity-60" />
                          {log.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#70AEFF]/10 text-[#70AEFF] border border-[#70AEFF]/20"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expanded Details / JSON Metadata */}
                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-border/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Metadata Payload
                            </span>
                            {log.metadata && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(JSON.stringify(log.metadata, null, 2))}
                                className="h-6 text-[11px] text-[#70AEFF] hover:bg-[#70AEFF]/10"
                              >
                                <Copy className="h-3 w-3 mr-1" /> Copy JSON
                              </Button>
                            )}
                          </div>

                          <div className="bg-black/60 rounded-xl p-3.5 font-mono text-xs text-blue-200 border border-border/80 overflow-x-auto">
                            {log.metadata && Object.keys(log.metadata).length > 0 ? (
                              <pre className="whitespace-pre-wrap leading-relaxed">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            ) : (
                              <span className="text-muted-foreground italic">No extra metadata provided</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: API TOKENS */}
      {activeTab === "tokens" && (
        <div className="space-y-6">
          <Card className="bg-card/70 border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Ingestion Tokens</CardTitle>
                <CardDescription>
                  API tokens used by 3rd-party services to authenticate and send logs to AutoHost Cloud
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setCreateTokenOpen(true)}
                className="bg-[#70AEFF] text-black font-semibold hover:bg-[#70AEFF]/90"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Create Token
              </Button>
            </CardHeader>

            <CardContent>
              {tokens.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No ingestion tokens generated yet. Click &quot;Create Token&quot; to issue your first API key.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Prefix</th>
                        <th className="py-3 px-4">Bound Node</th>
                        <th className="py-3 px-4">Created</th>
                        <th className="py-3 px-4">Last Seen</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {tokens.map((token) => {
                        const isRevoked = !!token.revoked_at
                        return (
                          <tr key={token.id} className={cn("hover:bg-card/50", isRevoked && "opacity-50")}>
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {token.name}
                              {isRevoked && (
                                <span className="ml-2 inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                                  Revoked
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-[#70AEFF]">{token.token_prefix}</td>
                            <td className="py-3 px-4 text-xs">{getNodeName(token.node_id)}</td>
                            <td className="py-3 px-4 text-xs text-muted-foreground">
                              {new Date(token.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground">
                              {token.last_seen_at ? new Date(token.last_seen_at).toLocaleString() : "Never"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {!isRevoked && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeToken(token.id)}
                                  className="text-xs text-destructive hover:bg-destructive/10"
                                >
                                  Revoke
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: INTEGRATION GUIDE */}
      {activeTab === "docs" && (
        <div className="space-y-6">
          <Card className="bg-card/70 border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Code2 className="h-5 w-5 text-[#70AEFF]" />
                How to Send External Logs
              </CardTitle>
              <CardDescription>
                Send structured JSON payloads to <code className="text-[#70AEFF] font-mono">POST https://api.autohst.dev/v1/external-logs/ingest</code> using your API token.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* cURL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">cURL Example</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(curlSnippet)}
                    className="h-7 text-xs border-border"
                  >
                    {copiedSnippet ? <Check className="h-3.5 w-3.5 text-emerald-400 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    Copy cURL
                  </Button>
                </div>
                <div className="bg-black/70 rounded-xl p-4 font-mono text-xs text-emerald-300 border border-border overflow-x-auto">
                  <pre>{curlSnippet}</pre>
                </div>
              </div>

              {/* JS Fetch */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">JavaScript / Fetch</h4>
                <div className="bg-black/70 rounded-xl p-4 font-mono text-xs text-blue-300 border border-border overflow-x-auto">
                  <pre>{jsSnippet}</pre>
                </div>
              </div>

              {/* Python */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Python (requests)</h4>
                <div className="bg-black/70 rounded-xl p-4 font-mono text-xs text-purple-300 border border-border overflow-x-auto">
                  <pre>{pythonSnippet}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DIALOG: Create Token */}
      <Dialog open={createTokenOpen} onOpenChange={setCreateTokenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Ingestion Token</DialogTitle>
            <DialogDescription>
              Generate a unique API key for external applications or third-party services to submit logs.
            </DialogDescription>
          </DialogHeader>

          {rawTokenCreated ? (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Important:</strong> Copy your token now. For security reasons, it will never be displayed again.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Generated Secret Token</label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={rawTokenCreated} className="font-mono text-xs bg-black/50 text-[#70AEFF]" />
                  <Button
                    onClick={() => copyToClipboard(rawTokenCreated, true)}
                    className="bg-[#70AEFF] text-black font-semibold hover:bg-[#70AEFF]/90"
                  >
                    {copiedToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => {
                    setRawTokenCreated(null)
                    setCreateTokenOpen(false)
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Token Name / Label *</label>
                <Input
                  placeholder="e.g. Production Payment Microservice"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateToken()}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Link to Specific Node (Optional)</label>
                <select
                  value={tokenNodeId}
                  onChange={(e) => setTokenNodeId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">No Node (Global / Standalone)</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.hostname} ({n.id.substring(0, 8)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  If linked to a node, logs sent with this token will automatically inherit this node ID unless explicitly overridden.
                </p>
              </div>

              <DialogFooter className="pt-3">
                <Button variant="outline" onClick={() => setCreateTokenOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateToken}
                  disabled={creatingToken || !tokenName.trim()}
                  className="bg-[#70AEFF] text-black font-semibold hover:bg-[#70AEFF]/90"
                >
                  {creatingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Token"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: Confirm Clear All Logs */}
      <Dialog open={clearLogsOpen} onOpenChange={setClearLogsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear All External Logs?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All ingested logs for your account will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setClearLogsOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAllLogs} disabled={clearing}>
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete All Logs"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
