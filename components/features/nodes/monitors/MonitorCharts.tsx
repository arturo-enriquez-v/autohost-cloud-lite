"use client";

import { useState } from "react";
import { format, formatDistanceStrict } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, OctagonX, RefreshCw, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MetricRange } from "@/lib/features/nodes/types";
import type {
  AutoHealEvent,
  MonitorIncident,
  MonitorStats,
} from "@/lib/features/nodes/monitoring/interfaces/service-monitor";
import { useEventHistory } from "@/lib/features/nodes/monitoring/hooks/useServiceMonitors";
import {
  describeAutoHealEvent,
  eventsForIncident,
  formatPercent,
  summarizeIncidentAutoHeal,
  type MonitorTone,
} from "@/lib/features/nodes/monitoring/monitor-status";

// Series colours, validated for the dark chart surface (dataviz validate_palette.js): categorical slots 1-2
// for the two latency series, and the status "critical" red for failed checks.
export const SERIES_AVG = "#3987e5";
export const SERIES_P95 = "#d95926";
export const STATUS_FAILED = "#d03b3b";
// Auto-heal action markers on the failed checks chart (categorical violet, checked against the red bars).
export const ACTION_MARK = "#9085e9";

const TONE_TEXT: Record<MonitorTone, string> = {
  ok: "text-green-600 dark:text-green-400",
  warn: "text-yellow-600 dark:text-yellow-400",
  bad: "text-red-600 dark:text-red-400",
  muted: "text-muted-foreground",
};

/** The bucket (by its start, as the API sent it) that contains a time, or null if none does. */
function bucketFor(time: string, buckets: { bucket: string }[], bucketSeconds: number): string | null {
  const t = new Date(time).getTime();
  for (const b of buckets) {
    const start = new Date(b.bucket).getTime();
    if (t >= start && t < start + bucketSeconds * 1000) return b.bucket;
  }
  return null;
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: "12px",
};

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

function formatTick(bucket: string, range: MetricRange) {
  const d = new Date(bucket);
  if (range === "1d") return format(d, "HH:mm");
  if (range === "7d") return format(d, "MMM d");
  return format(d, "MMM d");
}

function formatBucketLabel(bucket: string, bucketSeconds: number) {
  const start = new Date(bucket);
  const end = new Date(start.getTime() + bucketSeconds * 1000);
  return `${format(start, "MMM d, HH:mm")}–${format(end, "HH:mm")}`;
}

function ChartMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">{children}</div>
  );
}

// ─── Stat tiles ───────────────────────────────────────────────────────────────

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

export function MonitorStatTiles({ stats, showLatency }: { stats: MonitorStats | null; showLatency: boolean }) {
  const s = stats?.summary;
  return (
    <div className={`grid gap-3 grid-cols-2 ${showLatency ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      <Tile
        label="Availability"
        value={s?.uptimePercent != null ? formatPercent(s.uptimePercent) : "—"}
        detail={s ? `${s.passed.toLocaleString()} of ${s.checks.toLocaleString()} checks passed` : undefined}
      />
      {showLatency && (
        <Tile
          label="Response time"
          value={formatMs(s?.avgLatencyMs)}
          detail={s?.p95LatencyMs != null ? `p95 ${formatMs(s.p95LatencyMs)}` : undefined}
        />
      )}
      <Tile label="Incidents" value={s ? String(s.incidents) : "—"} detail="Times it was marked down" />
      <Tile label="Failed checks" value={s ? s.failed.toLocaleString() : "—"} />
    </div>
  );
}

// ─── Response time ────────────────────────────────────────────────────────────

export function ResponseTimeChart({
  stats,
  range,
  isLoading,
  description,
}: {
  stats: MonitorStats | null;
  range: MetricRange;
  isLoading: boolean;
  description: string;
}) {
  const data = (stats?.buckets ?? []).map((b) => ({
    bucket: b.bucket,
    avg: b.avgLatencyMs,
    p95: b.p95LatencyMs,
  }));
  const hasData = data.some((d) => d.avg !== null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Response time</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && !stats ? (
          <ChartMessage>Loading…</ChartMessage>
        ) : !hasData ? (
          <ChartMessage>No passed checks in this period</ChartMessage>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="bucket"
                tickFormatter={(v) => formatTick(v, range)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v) => formatMs(v)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                labelFormatter={(v) => formatBucketLabel(String(v), stats?.bucketSeconds ?? 0)}
                formatter={(value, name) => [formatMs(typeof value === "number" ? value : null), String(name)]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend verticalAlign="top" height={24} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <Line
                name="Average"
                type="monotone"
                dataKey="avg"
                stroke={SERIES_AVG}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
              <Line
                name="p95"
                type="monotone"
                dataKey="p95"
                stroke={SERIES_P95}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Failed checks ────────────────────────────────────────────────────────────

export function FailedChecksChart({
  stats,
  range,
  isLoading,
  autoHealEvents = [],
}: {
  stats: MonitorStats | null;
  range: MetricRange;
  isLoading: boolean;
  autoHealEvents?: AutoHealEvent[];
}) {
  const data = (stats?.buckets ?? []).map((b) => ({
    bucket: b.bucket,
    failed: b.failed,
    total: b.passed + b.failed,
  }));
  const failed = stats?.summary.failed ?? 0;
  // One dashed line per bucket in which auto-heal restarted, recreated or gave up.
  const markers = Array.from(
    new Set(
      autoHealEvents
        .filter((e) => e.action !== "recovered")
        .map((e) => (stats ? bucketFor(e.createdAt, stats.buckets, stats.bucketSeconds) : null))
        .filter((b): b is string => b !== null)
    )
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Failed checks</CardTitle>
        <CardDescription>When checks failed, per interval</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && !stats ? (
          <ChartMessage>Loading…</ChartMessage>
        ) : !stats || stats.summary.checks === 0 ? (
          <ChartMessage>No checks in this period</ChartMessage>
        ) : failed === 0 ? (
          <ChartMessage>No failed checks in this period</ChartMessage>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap={1}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="bucket"
                tickFormatter={(v) => formatTick(v, range)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                labelFormatter={(v) => formatBucketLabel(String(v), stats.bucketSeconds)}
                formatter={(value: number, _name: string, item: { payload?: { total: number } }) => [
                  `${value} of ${item.payload?.total ?? 0} checks`,
                  "Failed",
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="failed" name="Failed" fill={STATUS_FAILED} radius={[4, 4, 0, 0]} />
              {markers.map((b) => (
                <ReferenceLine key={b} x={b} stroke={ACTION_MARK} strokeWidth={2} strokeDasharray="4 3" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
        {stats && failed > 0 && (
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS_FAILED }} />
              Failed checks
            </span>
            {markers.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 border-l-2 border-dashed" style={{ borderColor: ACTION_MARK }} />
                Auto-heal action
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export function IncidentsTable({
  incidents,
  isLoading,
  autoHealEvents = [],
}: {
  incidents: MonitorIncident[];
  isLoading: boolean;
  autoHealEvents?: AutoHealEvent[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Incidents</CardTitle>
        <CardDescription>Times the service was marked down, newest first</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && !incidents.length ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !incidents.length ? (
          <p className="text-sm text-muted-foreground">No incidents in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] table-fixed text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-36 py-2 pr-4 font-medium">Started</th>
                  <th className="w-28 py-2 pr-4 font-medium">Duration</th>
                  <th className="w-20 py-2 pr-4 font-medium text-right">Failed</th>
                  <th className="w-56 py-2 pr-4 font-medium">Auto-heal</th>
                  <th className="py-2 font-medium">First error</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {incidents.map((i) => (
                  <tr key={i.startedAt}>
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                      {format(new Date(i.startedAt), "MMM d, HH:mm:ss")}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {i.resolvedAt ? (
                        formatDistanceStrict(new Date(i.resolvedAt), new Date(i.startedAt))
                      ) : (
                        <Badge variant="outline" className="text-red-600 dark:text-red-400">
                          Ongoing
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{i.failedChecks}</td>
                    <td className="py-2 pr-4 truncate">
                      {(() => {
                        const summary = summarizeIncidentAutoHeal(eventsForIncident(i, autoHealEvents));
                        return summary ? (
                          <span className={TONE_TEXT[summary.tone]} title={summary.text}>
                            {summary.text}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        );
                      })()}
                    </td>
                    <td className="py-2 truncate" title={i.message}>
                      {i.message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Check log ────────────────────────────────────────────────────────────────

export function CheckLog({ nodeId, monitorId }: { nodeId: string; monitorId: string }) {
  const [failedOnly, setFailedOnly] = useState(false);
  const { events, isLoading, error } = useEventHistory(nodeId, monitorId, true, 100);
  const shown = failedOnly ? events.filter((e) => e.status !== "up") : events;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Latest checks</CardTitle>
          <CardDescription>The last 100 results</CardDescription>
        </div>
        <Button
          variant={failedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setFailedOnly((v) => !v)}
          aria-pressed={failedOnly}
        >
          Failed only
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && !events.length ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !shown.length ? (
          <p className="text-sm text-muted-foreground">
            {failedOnly ? "No failed checks among the last 100." : "No checks yet."}
          </p>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[36rem] table-fixed text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-36 py-2 pr-4 font-medium">Time</th>
                  <th className="w-24 py-2 pr-4 font-medium">Result</th>
                  <th className="w-24 py-2 pr-4 font-medium text-right">Duration</th>
                  <th className="py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td className="py-1.5 pr-4 whitespace-nowrap tabular-nums text-muted-foreground">
                      {format(new Date(e.checkedAt), "MMM d, HH:mm:ss")}
                    </td>
                    <td className="py-1.5 pr-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            e.status === "up" ? "bg-green-500" : "bg-red-500"
                          }`}
                          aria-hidden
                        />
                        {e.status === "up" ? "Passed" : "Failed"}
                      </span>
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{formatMs(e.latencyMs)}</td>
                    <td className="py-1.5 truncate" title={e.message}>
                      {e.message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Auto-heal timeline ───────────────────────────────────────────────────────

const ACTION_ICON = {
  restart: RefreshCw,
  recreate: Wrench,
  gave_up: OctagonX,
  recovered: CheckCircle2,
} as const;

/** What auto-heal did over the range, newest first, with the error of failed commands. */
export function AutoHealTimeline({
  events,
  isLoading,
  enabled,
}: {
  events: AutoHealEvent[];
  isLoading: boolean;
  enabled: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Auto-heal</CardTitle>
        <CardDescription>
          {enabled
            ? "What auto-heal did when the service went down, and whether it came back"
            : "Auto-heal is off for this check; earlier actions are listed here"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && !events.length ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !events.length ? (
          <p className="text-sm text-muted-foreground">No auto-heal actions in this period.</p>
        ) : (
          <ol className="space-y-3">
            {events.map((e) => {
              const { title, tone } = describeAutoHealEvent(e);
              const Icon = ACTION_ICON[e.action] ?? RefreshCw;
              return (
                <li key={e.id} className="flex gap-3 min-w-0">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE_TEXT[tone]}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className={`text-sm font-medium ${TONE_TEXT[tone]}`}>{title}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {format(new Date(e.createdAt), "MMM d, HH:mm:ss")}
                      </span>
                    </div>
                    {e.error && <p className="text-xs text-red-600 dark:text-red-400 break-words">{e.error}</p>}
                    {!e.error && e.checkMessage && e.action !== "recovered" && (
                      <p className="text-xs text-muted-foreground break-words">Check: {e.checkMessage}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
