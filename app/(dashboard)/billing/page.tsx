// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { usePlans } from "@/lib/features/plans/hooks/usePlans"
import {
  Loader2,
  Activity,
  Server,
  HardDrive,
  Sparkles,
  FolderGit2,
  Terminal,
} from "lucide-react"

export default function UsagePage() {
  const { planUsage, isLoading, error } = usePlans()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-[#70AEFF]" />
            Resource Usage
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor real-time resource consumption across all your connected infrastructure.
          </p>
        </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Monitored Nodes */}
              <div className="p-5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Server className="h-4 w-4 text-[#70AEFF]" />
                    Monitored Nodes
                  </span>
                  <span className="text-lg font-mono font-bold text-foreground">
                    {planUsage.nodes_count}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Connected servers and VPS instances actively reporting telemetry.
                </p>
              </div>

              {/* Cloud Backup Storage */}
              <div className="p-5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <HardDrive className="h-4 w-4 text-sky-400" />
                    Cloud Backup Storage
                  </span>
                  <span className="text-lg font-mono font-bold text-foreground">
                    {(() => {
                      const bytes = planUsage.backup_storage_bytes || 0
                      const mb = bytes / (1024 * 1024)
                      if (bytes === 0) return "0 MB"
                      if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
                      if (mb < 1) return `${mb.toFixed(2)} MB`
                      return `${mb.toFixed(1)} MB`
                    })()}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Encrypted container &amp; volume snapshots stored in object storage.
                </p>
              </div>

              {/* AI Diagnostics */}
              <div className="p-5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    AI Diagnostics (This Month)
                  </span>
                  <span className="text-lg font-mono font-bold text-foreground">
                    {planUsage.ai_diagnostics_this_month}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Automated &amp; on-demand AI root cause inspections run this calendar month.
                </p>
              </div>

              {/* Projects */}
              <div className="p-5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <FolderGit2 className="h-4 w-4 text-amber-400" />
                    Projects &amp; Environments
                  </span>
                  <span className="text-lg font-mono font-bold text-foreground">
                    {planUsage.projects_count}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Configured projects organizing your nodes (Production, Staging, Homelab).
                </p>
              </div>

              {/* Custom Commands */}
              <div className="p-5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Terminal className="h-4 w-4 text-indigo-400" />
                    Custom Commands
                  </span>
                  <span className="text-lg font-mono font-bold text-foreground">
                    {planUsage.custom_commands_count}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Saved custom remote scripts and maintenance operations.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
