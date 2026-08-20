"use client"

import { usePlans } from "@/lib/features/plans/hooks/usePlans"
import { Loader2, Receipt, ShieldCheck, CheckCircle2, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function InvoicesPage() {
  const { userPlan, isLoading, error } = usePlans()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-emerald-400" />
            Invoices &amp; Billing History
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            View transaction receipts, payment status, and subscription billing details.
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
          <span>Loading billing information...</span>
        </div>
      ) : (
        <>
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Status Summary Banner */}
            <Card className="border-border/70 bg-card/60 backdrop-blur-xs">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Account in Good Standing
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Current plan: <strong className="text-foreground">{userPlan?.plan?.name || "Free (Developer)"}</strong> • Auto-renewal active
                      </CardDescription>
                    </div>
                  </div>

                  <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs px-3 py-1">
                    Good Standing
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Invoices Table */}
            <Card className="border-border/70 bg-card/60 backdrop-blur-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
                  Billing Receipts
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Description</th>
                        <th className="py-3 px-4 font-semibold">Amount</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-muted-foreground">
                      <tr>
                        <td className="py-3.5 px-4 font-mono text-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {userPlan?.plan?.name || "Free (Developer)"} Plan
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                          {userPlan?.plan?.price_cents === 0
                            ? "$0.00"
                            : `$${((userPlan?.plan?.price_cents || 0) / 100).toFixed(2)}`}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px]">
                            Paid / Active
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
