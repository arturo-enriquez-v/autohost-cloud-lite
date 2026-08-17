"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useEnrollments } from "@/lib/features/enrollments/hooks/useEnrollments"
import {
  Server,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Plus,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react"

interface ConnectNodeModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function ConnectNodeModal({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  trigger,
}: ConnectNodeModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = externalOpen !== undefined
  const isOpen = isControlled ? externalOpen : internalOpen
  const setIsOpen = isControlled ? externalOnOpenChange || (() => {}) : setInternalOpen

  const { generateToken, isLoading, error } = useEnrollments()
  const [tokenData, setTokenData] = useState<{ token: string; api_url?: string } | null>(null)
  const [nodeName, setNodeName] = useState("")
  const [copiedInstall, setCopiedInstall] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedOneLiner, setCopiedOneLiner] = useState(false)
  const [activeTab, setActiveTab] = useState<"steps" | "oneliner">("steps")

  const handleGenerate = async () => {
    const res = await generateToken()
    if (res.success && res.data) {
      setTokenData(res.data)
    }
  }

  useEffect(() => {
    if (isOpen && !tokenData && !isLoading) {
      handleGenerate()
    }
  }, [isOpen])

  const apiUrl =
    tokenData?.api_url ||
    (typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:8080`
      : "http://localhost:8080")

  const token = tokenData?.token || "GENERATING_TOKEN..."

  const installCommand = `curl -fsSL https://raw.githubusercontent.com/mazapanuwu13/autohost-cli/main/scripts/install.sh | bash`

  const linkCommand = `autohost enroll link --api ${apiUrl} --token ${token}${
    nodeName.trim() ? ` --name ${nodeName.trim()}` : ""
  }`

  const oneLinerCommand = `curl -fsSL https://raw.githubusercontent.com/mazapanuwu13/autohost-cli/main/scripts/install.sh | bash && autohost enroll link --api ${apiUrl} --token ${token}${
    nodeName.trim() ? ` --name ${nodeName.trim()}` : ""
  }`

  const copyToClipboard = (text: string, setCopiedFn: (val: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setCopiedFn(true)
    setTimeout(() => setCopiedFn(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button className="bg-[#70AEFF] hover:bg-[#5b9df5] text-slate-950 font-semibold shadow-md shadow-[#70AEFF]/20 transition-all">
            <Plus className="h-4 w-4 mr-2" />
            Connect Node
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-2xl bg-card border-border/80 text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#70AEFF]/15 border border-[#70AEFF]/30 text-[#70AEFF]">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Connect a New Node
                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px] uppercase font-semibold tracking-wider">
                  Linux Agent
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Run the CLI on your server (VPS, cloud, or bare-metal) to pair it with your AutoHost dashboard.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Switcher & Node Name Input */}
        <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("steps")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === "steps"
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-[#70AEFF]" />
                  Step-by-Step
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("oneliner")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === "oneliner"
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  One-liner Script
                </span>
              </button>
            </div>

            <div className="w-full sm:w-60">
              <Input
                placeholder="Node name (optional)"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                className="h-8 text-xs bg-muted/20 border-border/60"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              {error}
            </div>
          )}

          {activeTab === "steps" ? (
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#70AEFF]/20 text-[#70AEFF] text-[11px] font-bold">
                      1
                    </span>
                    Install AutoHost CLI on your server
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => copyToClipboard(installCommand, setCopiedInstall)}
                  >
                    {copiedInstall ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Copied
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </span>
                    )}
                  </Button>
                </div>
                <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-3 font-mono text-xs text-emerald-400 overflow-x-auto select-all">
                  {installCommand}
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                      2
                    </span>
                    Link & Enroll Node with Token
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={handleGenerate}
                      disabled={isLoading}
                      title="Generate new token"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => copyToClipboard(linkCommand, setCopiedLink)}
                      disabled={isLoading || !tokenData}
                    >
                      {copiedLink ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Check className="h-3.5 w-3.5" /> Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-3 font-mono text-xs text-amber-300 overflow-x-auto select-all min-h-[44px] flex items-center">
                  {isLoading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#70AEFF]" />
                      Generating single-use token...
                    </span>
                  ) : (
                    linkCommand
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* One-liner Script Tab */
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Single Terminal Command (Install & Link)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                  onClick={() => copyToClipboard(oneLinerCommand, setCopiedOneLiner)}
                  disabled={isLoading || !tokenData}
                >
                  {copiedOneLiner ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Check className="h-3.5 w-3.5" /> Copied One-liner
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="h-3.5 w-3.5" /> Copy Command
                    </span>
                  )}
                </Button>
              </div>

              <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-3 font-mono text-xs text-emerald-400 overflow-x-auto select-all min-h-[48px] flex items-center">
                {isLoading ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#70AEFF]" />
                    Generating token...
                  </span>
                ) : (
                  oneLinerCommand
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Paste and execute this command as root or with sudo on your target server.
              </p>
            </div>
          )}

          {/* Footer Note */}
          <div className="rounded-lg bg-muted/20 border border-border/40 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Token is single-use and valid for registration.</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setIsOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
