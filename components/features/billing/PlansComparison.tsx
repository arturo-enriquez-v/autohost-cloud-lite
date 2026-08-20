"use client"

import { useState } from "react"
import { Plan, UserPlan } from "@/lib/features/plans/types"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  Loader2,
  Zap,
  Server,
  Clock,
  Database,
  ShieldCheck,
  Sparkles,
  HardDrive,
  Info,
} from "lucide-react"

interface PlansComparisonProps {
  plans: Plan[]
  userPlan: UserPlan | null
  isUpdating: boolean
  onSelectPlan: (planId: string) => Promise<{ success: boolean; error?: string }>
}

interface HardcodedPlanDetails {
  badge?: string
  popular?: boolean
  nodesText: string
  backupText: string
  diagnosticsText: string
  retentionText: string
  pollingText: string
  features: string[]
}

const PLAN_META: Record<string, HardcodedPlanDetails> = {
  free: {
    badge: "Hobby & Devs",
    nodesText: "2 monitored nodes (free forever)",
    backupText: "500 MB Cloud Backup (3-day retention)",
    diagnosticsText: "5 AI Diagnostics / month",
    retentionText: "3 days metrics retention",
    pollingText: "Polling every 60 seconds",
    features: [
      "1-click In-Origin Secret Sanitizer",
      "Basic health checks & process auto-restart",
      "Executive PDF & TXT audit reports",
      "Community documentation & forum support",
    ],
  },
  starter: {
    badge: "Most Popular",
    popular: true,
    nodesText: "2 nodes included (+$2.50 / extra node/mo)",
    backupText: "10 GB Cloud Backup (14-day retention)",
    diagnosticsText: "20 AI Diagnostics / month",
    retentionText: "14 days metrics retention",
    pollingText: "Polling every 15 – 30 seconds",
    features: [
      "Advanced alerts (Webhooks / Telegram / Discord)",
      "Automated Docker & Compose backups",
      "Self-healing crash recovery engine",
      "Standard technical support",
    ],
  },
  pay_as_you_go: {
    badge: "Most Popular",
    popular: true,
    nodesText: "2 nodes included (+$2.50 / extra node/mo)",
    backupText: "10 GB Cloud Backup (14-day retention)",
    diagnosticsText: "20 AI Diagnostics / month",
    retentionText: "14 days metrics retention",
    pollingText: "Polling every 15 – 30 seconds",
    features: [
      "Advanced alerts (Webhooks / Telegram / Discord)",
      "Automated Docker & Compose backups",
      "Self-healing crash recovery engine",
      "Standard technical support",
    ],
  },
  pro: {
    badge: "Enterprise & Scale",
    nodesText: "10 nodes included (+$2.00 / extra node/mo)",
    backupText: "100 GB Cloud Backup (or BYOS S3/R2)",
    diagnosticsText: "Unlimited AI Diagnostics",
    retentionText: "60 to 90 days retention",
    pollingText: "Real-time polling: 5 – 10 seconds",
    features: [
      "Bring Your Own Storage (BYOS S3 / Cloudflare R2)",
      "Full security & audit trail export",
      "Dedicated 24/7 priority support & SLA",
      "Custom automated scheduled tasks",
    ],
  },
}

export function PlansComparison({ plans, userPlan, isUpdating, onSelectPlan }: PlansComparisonProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; error?: boolean } | null>(null)

  const currentPlanId = userPlan?.plan?.id || "free"

  const handleSwitch = async (planId: string) => {
    if (planId === currentPlanId) return
    setSelectedId(planId)
    setFeedbackMsg(null)

    const res = await onSelectPlan(planId)
    if (res.success) {
      setFeedbackMsg({ text: "Plan updated successfully!" })
    } else {
      setFeedbackMsg({ text: res.error || "Failed to update plan", error: true })
    }
    setSelectedId(null)
  }

  // If no dynamic plans returned by API yet, render default template
  const defaultFallbackPlans: Plan[] = [
    {
      id: "free",
      name: "Free (Developer)",
      price_cents: 0,
      description: "Ideal for developers and personal homelabs. Monitor up to 2 self-hosted nodes free with 500 MB backup storage.",
      max_nodes: 2,
      max_projects: 2,
      max_custom_commands: 5,
      retention_days: 3,
      polling_interval_sec: 60,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    {
      id: "starter",
      name: "Starter",
      price_cents: 500,
      description: "For growing developers and small projects. 2 nodes included (+$2.50/extra node), 10 GB cloud backup, and 14-day retention.",
      max_nodes: 2,
      max_projects: -1,
      max_custom_commands: -1,
      retention_days: 14,
      polling_interval_sec: 15,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    {
      id: "pro",
      name: "Pro",
      price_cents: 2900,
      description: "For startups and companies with mission-critical infrastructure. 10 nodes included (+$2.00/extra node), 100 GB backup, and unlimited AI diagnostics.",
      max_nodes: 10,
      max_projects: -1,
      max_custom_commands: -1,
      retention_days: 90,
      polling_interval_sec: 5,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
  ]

  const displayPlans = (plans.length > 0 ? plans : defaultFallbackPlans).map((p) => {
    if (p.id === "pro" && p.name.includes("/")) {
      return { ...p, name: "Pro" }
    }
    return p
  })

  return (
    <div className="space-y-8">
      {/* Notice Callout Banner */}
      <div className="p-4 rounded-lg bg-[#70AEFF]/10 border border-[#70AEFF]/30 text-xs text-muted-foreground flex items-start gap-3 shadow-sm">
        <Info className="h-5 w-5 text-[#70AEFF] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground block text-sm mb-0.5">
            Management & Monitoring Platform
          </span>
          Autohost plans cover the control plane software, agent monitoring, telemetry retention, and cloud backups for your self-hosted servers and VPS instances. Plans do not provide cloud hosting servers or VPS infrastructure.
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-lg border flex items-center justify-between text-sm transition-all ${
            feedbackMsg.error
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {displayPlans.map((p) => {
          const isCurrent = p.id === currentPlanId || (currentPlanId === "pay_as_you_go" && p.id === "starter")
          const meta = PLAN_META[p.id] || {
            nodesText: p.max_nodes === -1 ? "Unlimited nodes" : `${p.max_nodes} nodes included`,
            backupText: "Cloud backup storage",
            diagnosticsText: "AI Diagnostics included",
            retentionText: `${p.retention_days} days data retention`,
            pollingText: `Polling every ${p.polling_interval_sec}s`,
            features: [],
          }
          const isSelectedLoading = isUpdating && selectedId === p.id

          const formattedPrice = p.price_cents === 0 ? "$0" : `$${(p.price_cents / 100).toFixed(0)}`

          return (
            <Card
              key={p.id}
              className={`relative flex flex-col justify-between transition-all duration-200 border ${
                meta.popular
                  ? "border-[#70AEFF] bg-card shadow-lg shadow-[#70AEFF]/5"
                  : isCurrent
                  ? "border-emerald-500/50 bg-card"
                  : "border-border/60 hover:border-border"
              }`}
            >
              <div>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                      {p.name}
                    </CardTitle>
                    {isCurrent ? (
                      <Badge variant="outline" className="bg-emerald-500/15 border-emerald-500/30 text-emerald-400 text-xs">
                        Current Plan
                      </Badge>
                    ) : meta.badge ? (
                      <Badge className="bg-[#70AEFF] text-slate-950 font-semibold text-xs">
                        {meta.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription className="text-xs min-h-[36px] text-muted-foreground">
                    {p.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-0">
                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground">
                      {formattedPrice}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">/ mo</span>
                  </div>

                  {/* Key Highlights */}
                  <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-xs border border-border/40">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Server className="h-4 w-4 text-[#70AEFF] shrink-0" />
                      <span>{meta.nodesText}</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <HardDrive className="h-4 w-4 text-sky-400 shrink-0" />
                      <span>{meta.backupText}</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                      <span>{meta.diagnosticsText}</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Database className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{meta.retentionText}</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>{meta.pollingText}</span>
                    </div>
                  </div>

                  {/* Detailed Feature List */}
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-2">
                      Includes:
                    </p>
                    {meta.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </div>

              <CardFooter className="pt-4">
                <Button
                  className="w-full font-medium"
                  variant={isCurrent ? "outline" : meta.popular ? "default" : "secondary"}
                  disabled={isCurrent || isUpdating}
                  onClick={() => handleSwitch(p.id)}
                >
                  {isSelectedLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : isCurrent ? (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      Active Plan
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-4 w-4" />
                      Select {p.name}
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Feature Comparison Table */}
      <Card className="border border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Feature Comparison Matrix</CardTitle>
          <CardDescription className="text-xs">
            Compare data retention, backup storage, polling frequency, and resource limits for each plan in detail.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/80 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Feature</th>
                <th className="py-3 px-4 font-semibold text-center">Free (Developer)</th>
                <th className="py-3 px-4 font-semibold text-center">Starter</th>
                <th className="py-3 px-4 font-semibold text-center">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              <tr>
                <td className="py-3.5 px-4 font-medium text-foreground">Base Price</td>
                <td className="py-3.5 px-4 text-center font-semibold text-foreground">$0 / mo</td>
                <td className="py-3.5 px-4 text-center font-semibold text-[#70AEFF]">$5 / mo</td>
                <td className="py-3.5 px-4 text-center font-semibold text-[#70AEFF]">$29 / mo</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-foreground">Monitored Nodes</td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">2 monitored nodes (free forever)</td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">2 nodes (+$2.50 / extra node/mo)</td>
                <td className="py-3.5 px-4 text-center font-medium text-foreground">10 nodes included (+$2.00 / extra node/mo)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-foreground">Cloud Backup Storage</td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">500 MB Cloud Storage</td>
                <td className="py-3.5 px-4 text-center font-medium text-foreground">10 GB Cloud Storage</td>
                <td className="py-3.5 px-4 text-center font-medium text-sky-400">100 GB Cloud Storage (or BYOS S3/R2)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-foreground">Backup Retention</td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">3 days maximum</td>
                <td className="py-3.5 px-4 text-center font-medium text-foreground">14 days retention</td>
                <td className="py-3.5 px-4 text-center font-medium text-emerald-400">Custom / 90 days retention</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-foreground">AI Diagnostics</td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">5 diagnostics / month</td>
                <td className="py-3.5 px-4 text-center font-medium text-foreground">20 diagnostics / month</td>
                <td className="py-3.5 px-4 text-center font-medium text-purple-400">Unlimited (fair rate limit)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-foreground">Metrics & Telemetry Retention</td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">3 days</td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">14 days</td>
                <td className="py-3.5 px-4 text-center font-medium text-emerald-400">60 to 90 days</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-foreground">Polling Frequency</td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">Every 60 seconds</td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">Every 15 – 30 seconds</td>
                <td className="py-3.5 px-4 text-center font-medium text-amber-400">Real-time (5 – 10 seconds)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-foreground">Key Capabilities & Support</td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">Secret Sanitizer & Community Support</td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">Webhooks/Telegram Alerts & Standard Support</td>
                <td className="py-3.5 px-4 text-center font-medium text-foreground">BYOS S3/R2, Full Audit & 24/7 Priority SLA</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
