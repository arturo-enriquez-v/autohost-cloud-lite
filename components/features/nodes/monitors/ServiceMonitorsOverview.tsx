"use client";

import Link from "next/link";
import { ResponsiveContainer, Line, LineChart, Tooltip, YAxis } from "recharts";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MetricRange } from "@/lib/features/nodes/types";
import type { ServiceMonitor } from "@/lib/features/nodes/monitoring/interfaces/service-monitor";
import { useMonitorStats, useServiceMonitors } from "@/lib/features/nodes/monitoring/hooks/useServiceMonitors";
import { bucketTone, formatPercent, monitorState, type MonitorTone } from "@/lib/features/nodes/monitoring/monitor-status";
import { SERIES_AVG, formatMs } from "./MonitorCharts";

const DOT: Record<MonitorTone, string> = {
  ok: "bg-green-500",
  warn: "bg-yellow-500",
  bad: "bg-red-500",
  muted: "bg-gray-400",
};

const STRIP: Record<MonitorTone, string> = {
  ok: "bg-green-500",
  warn: "bg-yellow-500",
  bad: "bg-red-500",
  muted: "bg-muted",
};

const CHECK_TYPE_LABEL: Record<string, string> = { process: "Container", http: "HTTP", tcp: "TCP" };

export function monitorDetailHref(nodeId: string, monitorId: string) {
  return `/node/${nodeId}/monitoring/services/${monitorId}`;
}

function MonitorOverviewCard({ nodeId, monitor, range }: { nodeId: string; monitor: ServiceMonitor; range: MetricRange }) {
  const { stats } = useMonitorStats(nodeId, monitor.id, range);
  const state = monitorState(monitor);
  const showLatency = monitor.checkType !== "process";
  const s = stats?.summary;
  const latency = (stats?.buckets ?? []).map((b) => ({ bucket: b.bucket, avg: b.avgLatencyMs }));

  return (
    <Link
      href={monitorDetailHref(nodeId, monitor.id)}
      className="group block rounded-lg border p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${DOT[state.tone]}`} aria-hidden />
        <span className="font-medium text-sm truncate">{monitor.serviceName}</span>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {CHECK_TYPE_LABEL[monitor.checkType] ?? monitor.checkType}
        </Badge>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{state.label}</p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums">
            {s?.uptimePercent != null ? formatPercent(s.uptimePercent) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            available
            {s ? ` · ${s.incidents} ${s.incidents === 1 ? "incident" : "incidents"}` : ""}
          </p>
        </div>
        {showLatency && s?.avgLatencyMs != null && (
          <div className="text-right">
            <p className="text-sm font-medium tabular-nums">{formatMs(s.avgLatencyMs)}</p>
            <p className="text-xs text-muted-foreground">p95 {formatMs(s.p95LatencyMs)}</p>
          </div>
        )}
      </div>

      <div className="mt-3 h-10">
        {showLatency && latency.some((p) => p.avg !== null) ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latency} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                formatter={(v) => [formatMs(typeof v === "number" ? v : null), "Average"]}
                labelFormatter={(v) => new Date(String(v)).toLocaleString()}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Line type="monotone" dataKey="avg" stroke={SERIES_AVG} strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          // Container checks have no meaningful latency: show when checks passed and failed.
          <div className="flex h-3 w-full gap-px overflow-hidden rounded mt-4">
            {(stats?.buckets ?? []).map((b) => {
              const tone = bucketTone({
                bucket: b.bucket,
                status: b.passed + b.failed === 0 ? "no_data" : b.failed > 0 ? "down" : "up",
                up: b.passed,
                down: b.failed,
              });
              return (
                <div
                  key={b.bucket}
                  className={`flex-1 ${STRIP[tone]}`}
                  title={`${new Date(b.bucket).toLocaleString()}: ${b.passed} passed, ${b.failed} failed`}
                />
              );
            })}
          </div>
        )}
      </div>
    </Link>
  );
}

/** One card per health check of the node, over the page's range. */
export function ServiceMonitorsOverview({ nodeId, range }: { nodeId: string; range: MetricRange }) {
  const { monitors, isLoading } = useServiceMonitors(nodeId);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Services</CardTitle>
        <CardDescription>Health checks on this node. Open one for its charts and incidents.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : monitors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No health checks yet. Add them from{" "}
            <Link href={`/node/${nodeId}`} className="underline underline-offset-2 hover:text-foreground">
              Monitoring &amp; Health
            </Link>{" "}
            on the node page.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {monitors.map((m) => (
              <MonitorOverviewCard key={m.id} nodeId={nodeId} monitor={m} range={range} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
