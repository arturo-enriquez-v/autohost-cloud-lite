"use client"

import { usePlans } from "@/lib/features/plans/hooks/usePlans"
import { PlansComparison } from "@/components/features/billing/PlansComparison"
import { Loader2, Zap, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function PlansPage() {
  const { plans, userPlan, isLoading, isUpdating, error, selectPlan } = usePlans()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Zap className="h-6 w-6 text-amber-400" />
            Subscription Plans &amp; Pricing
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Compare infrastructure tiers, node allowances, and backup storage capacity.
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
          <span>Loading subscription plans...</span>
        </div>
      ) : (
        <>
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          <PlansComparison
            plans={plans}
            userPlan={userPlan}
            isUpdating={isUpdating}
            onSelectPlan={selectPlan}
          />
        </>
      )}
    </div>
  )
}
