// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useRouter } from "next/navigation"
import { AlertCircle, ExternalLink, Loader2, Mail } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useReportSettings } from "@/lib/features/report-settings/hooks/useReportSettings"

const UTC_HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHour(h: number) {
  const period = h < 12 ? "AM" : "PM"
  const display = h % 12 === 0 ? 12 : h % 12
  return `${String(display).padStart(2, "0")}:00 ${period} (UTC)`
}

/** The user's daily node status report by email: on/off and delivery hour. */
export function EmailReportsCard() {
  const router = useRouter()
  const { settings, isLoading, isSaving, error, save } = useReportSettings()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email reports
            </CardTitle>
            <CardDescription>
              A daily node status report by email with metrics, alerts and uptime.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/reports")}>
            Recipients &amp; groups <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="report-toggle" className="text-sm font-medium">
              Daily report
            </Label>
            <p className="text-xs text-muted-foreground">Sent to your account email once a day</p>
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              id="report-toggle"
              checked={settings.enabled}
              onCheckedChange={(enabled) => save({ ...settings, enabled })}
              disabled={isSaving}
            />
          )}
        </div>
        <div className={`space-y-2 transition-opacity ${settings.enabled ? "opacity-100" : "pointer-events-none opacity-40"}`}>
          <Label htmlFor="report-hour" className="text-sm font-medium">
            Delivery time
          </Label>
          <Select
            value={String(settings.hour_utc)}
            onValueChange={(v) => save({ ...settings, hour_utc: Number(v) })}
            disabled={!settings.enabled || isSaving || isLoading}
          >
            <SelectTrigger id="report-hour" className="w-56">
              <SelectValue placeholder="Select hour" />
            </SelectTrigger>
            <SelectContent>
              {UTC_HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {formatHour(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">All times are in UTC.</p>
        </div>
      </CardContent>
    </Card>
  )
}
