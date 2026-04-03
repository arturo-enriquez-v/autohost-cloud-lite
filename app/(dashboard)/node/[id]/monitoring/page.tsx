"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { format } from "date-fns"
import { ArrowLeft, RefreshCw, Activity, Cpu, MemoryStick, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useNode } from "@/lib/hooks/useNode"
import { useNodeMetrics, type MetricRange } from "@/lib/hooks/useNodeMetrics"

const RANGES: { value: MetricRange; label: string }[] = [
  { value: "1d", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
]

function formatAxisTick(bucket: string, range: MetricRange) {
  try {
    const d = new Date(bucket)
    if (range === "1d") return format(d, "HH:mm")
    if (range === "30d") return format(d, "MMM d")
    return format(d, "MMM d HH:mm")
  } catch {
    return bucket
  }
}

function formatTooltipLabel(bucket: string, range: MetricRange) {
  try {
    const d = new Date(bucket)
    if (range === "1d") return format(d, "MMM d, HH:mm")
    return format(d, "MMM d, HH:mm")
  } catch {
    return bucket
  }
}

interface MetricChartProps {
  title: string
  description: string
  dataKey: string
  color: string
  icon: React.ReactNode
  data: { bucket: string; [key: string]: number | string }[]
  range: MetricRange
  isLoading: boolean
}

function MetricChart({ title, description, dataKey, color, icon, data, range, isLoading }: MetricChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
            Loading…
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="bucket"
                tickFormatter={(v) => formatAxisTick(v, range)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                labelFormatter={(v) => formatTooltipLabel(String(v), range)}
                formatter={(value: number) => [`${value.toFixed(1)}%`, title]}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${dataKey})`}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default function MonitoringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()
  const [range, setRange] = useState<MetricRange>("7d")

  const { node, isLoading: nodeLoading } = useNode(nodeId)
  const { points, isLoading, error, lastUpdated, refresh } = useNodeMetrics(nodeId, range)

  const chartData = points.map((p) => ({
    bucket: p.bucket,
    cpu_usage_percent: parseFloat(p.cpu_usage_percent.toFixed(1)),
    memory_usage_percent: parseFloat(p.memory_usage_percent.toFixed(1)),
    disk_usage_percent: parseFloat(p.disk_usage_percent.toFixed(1)),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground truncate flex items-center gap-2">
              <Activity className="h-6 w-6 shrink-0" />
              Monitoring
            </h2>
            {!nodeLoading && node && (
              <Badge variant="outline" className="text-xs font-mono">
                {node.name}
              </Badge>
            )}
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Updated {format(lastUpdated, "HH:mm:ss")} · auto-refreshes every 30s
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Range selector */}
          <div className="flex items-center rounded-md border bg-background text-sm">
            {RANGES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={`px-3 py-1.5 transition-colors first:rounded-l-md last:rounded-r-md ${
                  range === value
                    ? "bg-primary text-primary-foreground"
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

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-1">
        <MetricChart
          title="CPU Usage"
          description="Average CPU utilization"
          dataKey="cpu_usage_percent"
          color="#3b82f6"
          icon={<Cpu className="h-4 w-4 text-blue-400" />}
          data={chartData}
          range={range}
          isLoading={isLoading}
        />
        <MetricChart
          title="RAM Usage"
          description="Average memory utilization"
          dataKey="memory_usage_percent"
          color="#22c55e"
          icon={<MemoryStick className="h-4 w-4 text-green-400" />}
          data={chartData}
          range={range}
          isLoading={isLoading}
        />
        <MetricChart
          title="Disk Usage"
          description="Average disk utilization"
          dataKey="disk_usage_percent"
          color="#f97316"
          icon={<HardDrive className="h-4 w-4 text-orange-400" />}
          data={chartData}
          range={range}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
