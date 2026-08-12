"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Activity, Cpu, MemoryStick, RefreshCw, Server, HardDrive } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DockerContainer, MetricRange } from "@/lib/features/nodes/types";
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

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

interface ContainerStateBadgeProps {
  state: string;
}

function ContainerStateBadge({ state }: ContainerStateBadgeProps) {
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

interface ContainerMetricsDialogProps {
  nodeId: string;
  container: DockerContainer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContainerMetricsDialog({
  nodeId,
  container,
  open,
  onOpenChange,
}: ContainerMetricsDialogProps) {
  const [range, setRange] = useState<MetricRange>("7d");
  const containerName = container?.name ?? "";

  const { points, isLoading, error, lastUpdated, refresh } = useContainerMetrics(
    nodeId,
    containerName,
    range,
    open && Boolean(containerName)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <span>{container?.name}</span>
                  {container?.state && <ContainerStateBadge state={container.state} />}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono text-muted-foreground mt-0.5">
                  ID: {container?.id?.substring(0, 12)} · Image: {container?.image}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-md border bg-background text-xs">
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
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={refresh} disabled={isLoading}>
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-[11px] text-muted-foreground">
              History updated {format(lastUpdated, "HH:mm:ss")} · auto-refreshes every 30s
            </p>
          )}
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Live snapshot stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-2">
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <Cpu className="h-8 w-8 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">CPU Usage</p>
                <p className="text-xl font-bold font-mono">
                  {container?.cpu ?? (latestPoint ? `${latestPoint.cpu_usage_percent}%` : "—")}
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
                  {container?.memPerc ?? (latestPoint ? `${latestPoint.memory_usage_percent}%` : "—")}
                </p>
                {container?.mem && (
                  <p className="text-[10px] text-muted-foreground font-mono">{container.mem}</p>
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
                  {container?.status ?? "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="space-y-6 mt-4">
          {/* CPU Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Cpu className="h-4 w-4 text-blue-500" />
                Container CPU Usage (%)
              </CardTitle>
              <CardDescription className="text-xs">
                Average CPU utilization over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                  Loading container metrics…
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                  No container metrics recorded for this period yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="container-grad-cpu" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#container-grad-cpu)"
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
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <MemoryStick className="h-4 w-4 text-green-500" />
                Container Memory Usage (%)
              </CardTitle>
              <CardDescription className="text-xs">
                Average RAM percentage utilization over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                  Loading container metrics…
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                  No memory metrics recorded for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="container-grad-mem" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#container-grad-mem)"
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
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <HardDrive className="h-4 w-4 text-purple-500" />
                Container Memory Used (MB)
              </CardTitle>
              <CardDescription className="text-xs">
                Absolute memory consumed by container over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                  Loading memory metrics…
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                  No memory usage recorded for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="container-grad-bytes" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#container-grad-bytes)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
