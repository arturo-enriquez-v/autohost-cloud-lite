"use client"

import { usePlans } from "@/lib/features/plans/hooks/usePlans"
import {
  Loader2,
  Activity,
  ShieldCheck,
  Server,
  HardDrive,
  Sparkles,
  Database,
  FolderGit2,
  Terminal,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

export default function UsagePage() {
  const { userPlan, planUsage, isLoading, error } = usePlans()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-[#70AEFF]" />
            Resource Usage &amp; Quotas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor real-time consumption and active tier limits across all your connected infrastructure.
          </p>
        </div>

        {userPlan?.plan && (
          <div className="flex items-center gap-2.5 bg-card border border-border/80 px-3.5 py-2 rounded-lg shadow-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <div className="text-xs">
              <span className="text-muted-foreground">Active plan: </span>
              <span className="font-semibold text-foreground">{userPlan.plan.name}</span>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px] uppercase font-mono ml-1">
              Active
            </Badge>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#70AEFF]" />
          <span>Loading resource usage data...</span>
        </div>
      ) : (
        <>
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          {planUsage && (
            <div className="space-y-6">
              {/* Plan Overview Banner */}
              <Card className="border-border/70 bg-card/60 backdrop-blur-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        Active Tier: <span className="text-[#70AEFF]">{planUsage.plan.name}</span>
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {planUsage.plan.description || "Manage your server infrastructure quotas and retention limits."}
                      </CardDescription>
                    </div>

                    <Link href="/billing/plans">
                      <Button
                        size="sm"
                        className="bg-[#70AEFF] hover:bg-[#5b9df5] text-slate-950 font-semibold text-xs h-8 gap-1.5 shadow-xs"
                      >
                        Upgrade Capacity <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
              </Card>

              {/* Resource Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Monitored Nodes */}
                <div className="p-4 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Server className="h-4 w-4 text-[#70AEFF]" />
                      Monitored Nodes
                    </span>
                    <span className="text-xs font-mono font-medium text-foreground">
                      {planUsage.nodes_count} / {planUsage.nodes_limit === -1 ? "∞" : planUsage.nodes_limit}
                    </span>
                  </div>
                  <Progress
                    value={
                      planUsage.nodes_limit === -1
                        ? 15
                        : Math.min(100, (planUsage.nodes_count / planUsage.nodes_limit) * 100)
                    }
                    className="h-2 bg-muted"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {planUsage.nodes_limit === -1
                      ? "Unlimited connected servers and VPS instances."
                      : `${Math.max(0, planUsage.nodes_limit - planUsage.nodes_count)} node slot(s) remaining on your plan.`}
                  </p>
                </div>

                {/* Cloud Backup Storage */}
                <div className="p-4 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <HardDrive className="h-4 w-4 text-sky-400" />
                      Cloud Backup Storage
                    </span>
                    <span className="text-xs font-mono font-medium text-foreground">
                      {(() => {
                        const bytes = planUsage.backup_storage_bytes
                        const mb = bytes / (1024 * 1024)
                        const usedText =
                          bytes === 0 ? "0 MB" : mb < 1 ? `${mb.toFixed(2)} MB` : `${mb.toFixed(1)} MB`
                        const limitMb = planUsage.backup_storage_limit_bytes / (1024 * 1024)
                        const limitText =
                          planUsage.backup_storage_limit_bytes === -1
                            ? "∞"
                            : limitMb >= 1024
                            ? `${(limitMb / 1024).toFixed(0)} GB`
                            : `${limitMb.toFixed(0)} MB`
                        return `${usedText} / ${limitText}`
                      })()}
                    </span>
                  </div>
                  <Progress
                    value={
                      planUsage.backup_storage_limit_bytes <= 0
                        ? 0
                        : Math.min(
                            100,
                            (planUsage.backup_storage_bytes / planUsage.backup_storage_limit_bytes) * 100
                          )
                    }
                    className="h-2 bg-muted"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Encrypted container &amp; volume snapshots stored in Cloudflare R2.
                  </p>
                </div>

                {/* AI Diagnostics */}
                <div className="p-4 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      AI Diagnostics (Monthly)
                    </span>
                    <span className="text-xs font-mono font-medium text-foreground">
                      {planUsage.ai_diagnostics_this_month} /{" "}
                      {planUsage.ai_diagnostics_month_limit === -1 ? "∞" : planUsage.ai_diagnostics_month_limit}
                    </span>
                  </div>
                  <Progress
                    value={
                      planUsage.ai_diagnostics_month_limit === -1
                        ? 15
                        : Math.min(
                            100,
                            (planUsage.ai_diagnostics_this_month / planUsage.ai_diagnostics_month_limit) * 100
                          )
                    }
                    className="h-2 bg-muted"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {planUsage.ai_diagnostics_month_limit === -1
                      ? "Unlimited automated & on-demand AI root cause inspections."
                      : `Resets on the 1st of every calendar month.`}
                  </p>
                </div>

                {/* Metrics Retention */}
                <div className="p-4 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Database className="h-4 w-4 text-emerald-400" />
                      Metrics Retention
                    </span>
                    <span className="text-xs font-mono font-medium text-emerald-400">
                      {planUsage.plan.retention_days} days
                    </span>
                  </div>
                  <Progress value={100} className="h-2 bg-muted" />
                  <p className="text-[11px] text-muted-foreground">
                    Historical CPU, memory, disk, and network telemetry window.
                  </p>
                </div>

                {/* Projects Limit */}
                <div className="p-4 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <FolderGit2 className="h-4 w-4 text-amber-400" />
                      Projects &amp; Environments
                    </span>
                    <span className="text-xs font-mono font-medium text-foreground">
                      {planUsage.projects_count} /{" "}
                      {planUsage.projects_limit === -1 ? "∞" : planUsage.projects_limit}
                    </span>
                  </div>
                  <Progress
                    value={
                      planUsage.projects_limit === -1
                        ? 15
                        : Math.min(100, (planUsage.projects_count / planUsage.projects_limit) * 100)
                    }
                    className="h-2 bg-muted"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Organize nodes into environments (Production, Staging, Homelab).
                  </p>
                </div>

                {/* Custom Commands */}
                <div className="p-4 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Terminal className="h-4 w-4 text-indigo-400" />
                      Custom Commands
                    </span>
                    <span className="text-xs font-mono font-medium text-foreground">
                      {planUsage.custom_commands_count} /{" "}
                      {planUsage.custom_commands_limit === -1 ? "∞" : planUsage.custom_commands_limit}
                    </span>
                  </div>
                  <Progress
                    value={
                      planUsage.custom_commands_limit === -1
                        ? 15
                        : Math.min(100, (planUsage.custom_commands_count / planUsage.custom_commands_limit) * 100)
                    }
                    className="h-2 bg-muted"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Custom remote scripts and maintenance operations.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
