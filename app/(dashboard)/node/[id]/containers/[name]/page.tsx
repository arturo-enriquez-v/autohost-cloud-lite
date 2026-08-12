"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Activity, Cpu, MemoryStick, RefreshCw, Server, HardDrive, Box } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricRange } from "@/lib/features/nodes/types";
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes";
import { useContainersLive } from "@/lib/features/nodes/containers/hooks/useContainersLive";
import { useContainerMetrics } from "@/lib/features/nodes/containers/hooks/useContainerMetrics";

const RANGES: { value: MetricRange; label: string }[] = [
  { value: "1d", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

function formatAxisTick(bucket: string, range: MetricRange) {
  try {
    const d = new Date(bucket);
    if (range === "1d") return format(d, "HH:mm");
    if (range === "30d") return format(d, "MMM d");
    return format(d, "MMM d HH:mm");
  } catch {
    return bucket;
  }
}

function formatTooltipLabel(bucket: string) {
  try {
    const d = new Date(bucket);
    return format(d, "MMM d, HH:mm:ss");
  } catch {
    return bucket;
  }
}

function ContainerStateBadge({ state }: { state: string }) {
  const cfg: Record<string, string> = {
    running: "bg-green-500/15 text-green-600 border-green-500/30",
    exited: "bg-muted text-muted-foreground",
    stopped: "bg-muted text-muted-foreground",
    paused: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    restarting: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  };
  return (
    <Badge variant="outline" className={cfg[state] ?? "bg-muted text-muted-foreground"}>
      {state}
    </Badge>
  );
}

export default function ContainerMetricsPage({
  params,
}: {
  params: Promise<{ id: string; name: string }>;
}) {
  const { id: nodeId, name: rawContainerName } = use(params);
  const containerName = decodeURIComponent(rawContainerName);
  const router = useRouter();
  const [range, setRange] = useState<MetricRange>("7d");

  const { node, isLoading: nodeLoading } = useNodes(nodeId);
  const { containers } = useContainersLive(nodeId);
  const liveContainer = containers.find(
    (c) => c.name === containerName || c.id === containerName
  );

  const { points, isLoading, error, lastUpdated, refresh } = useContainerMetrics(
    nodeId,
    containerName,
    range
  );

  const chartData = points.map((p) => ({
    bucket: p.bucket,
    cpu_usage_percent: parseFloat((p.cpu_usage_percent || 0).toFixed(1)),
    memory_usage_percent: parseFloat((p.memory_usage_percent || 0).toFixed(1)),
    memory_usage_bytes: p.memory_usage_bytes || 0,
    memory_mb: parseFloat(((p.memory_usage_bytes || 0) / (1024 * 1024)).toFixed(1)),
    state: p.state,
  }));

  const latestPoint = chartData[chartData.length - 1];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground truncate flex items-center gap-2">
              <Box className="h-6 w-6 shrink-0 text-primary" />
              Container Metrics: <span className="font-mono">{containerName}</span>
            </h2>
            {liveContainer?.state && <ContainerStateBadge state={liveContainer.state} />}
            {!nodeLoading && node && (
              <Badge variant="outline" className="text-xs font-mono">
                {node.name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {liveContainer?.image ? `Image: ${liveContainer.image}` : `Node ID: ${nodeId}`}
            {lastUpdated && ` · History updated ${format(lastUpdated, "HH:mm:ss")} (auto-refreshes 30s)`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-md border bg-background text-sm">
            {RANGES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={`px-3 py-1.5 transition-colors first:rounded-l-md last:rounded-r-md ${
                  range === value
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Live snapshot stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Cpu className="h-8 w-8 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">CPU Usage</p>
              <p className="text-xl font-bold font-mono">
                {liveContainer?.cpu ?? (latestPoint ? `${latestPoint.cpu_usage_percent}%` : "—")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <MemoryStick className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Memory Usage</p>
              <p className="text-xl font-bold font-mono">
                {liveContainer?.memPerc ?? (latestPoint ? `${latestPoint.memory_usage_percent}%` : "—")}
              </p>
              {liveContainer?.mem && (
                <p className="text-[10px] text-muted-foreground font-mono">{liveContainer.mem}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Server className="h-8 w-8 text-purple-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Status & Uptime</p>
              <p className="text-sm font-semibold truncate font-mono">
                {liveContainer?.status ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* CPU Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Cpu className="h-5 w-5 text-blue-500" />
              Container CPU Usage (%)
            </CardTitle>
            <CardDescription>Average CPU utilization over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Loading container metrics…
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                No container metrics recorded for this period yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="page-container-grad-cpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => formatAxisTick(v, range)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, "auto"]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    labelFormatter={(v) => formatTooltipLabel(String(v))}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "CPU Usage"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu_usage_percent"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#page-container-grad-cpu)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Memory % Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <MemoryStick className="h-5 w-5 text-green-500" />
              Container Memory Usage (%)
            </CardTitle>
            <CardDescription>Average RAM percentage utilization over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Loading container metrics…
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                No memory metrics recorded for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="page-container-grad-mem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => formatAxisTick(v, range)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, "auto"]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    labelFormatter={(v) => formatTooltipLabel(String(v))}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "RAM Usage"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="memory_usage_percent"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#page-container-grad-mem)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Memory Bytes (MB) Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <HardDrive className="h-5 w-5 text-purple-500" />
              Container Memory Used (MB)
            </CardTitle>
            <CardDescription>Absolute memory consumed by container over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Loading memory metrics…
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                No memory usage recorded for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="page-container-grad-bytes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => formatAxisTick(v, range)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, "auto"]}
                    tickFormatter={(v) => `${v} MB`}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />
                  <Tooltip
                    labelFormatter={(v) => formatTooltipLabel(String(v))}
                    formatter={(value: number) => [`${value.toFixed(1)} MB`, "Memory Used"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="memory_mb"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="url(#page-container-grad-bytes)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
