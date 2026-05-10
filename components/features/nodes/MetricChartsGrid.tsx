"use client"

import { format } from "date-fns"
import { Cpu, HardDrive, MemoryStick } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MetricRange } from "../../../lib/features/nodes/types"

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
    return format(d, range === "1d" ? "MMM d, HH:mm" : "MMM d, HH:mm")
  } catch {
    return bucket
  }
}

interface ChartPoint {
  bucket: string
  [key: string]: number | string
}

interface MetricChartProps {
  title: string
  description: string
  dataKey: string
  color: string
  icon: React.ReactNode
  data: ChartPoint[]
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

export interface MetricChartsGridProps {
  data: ChartPoint[]
  range: MetricRange
  isLoading: boolean
}

export function MetricChartsGrid({ data, range, isLoading }: MetricChartsGridProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-1">
      <MetricChart
        title="CPU Usage"
        description="Average CPU utilization"
        dataKey="cpu_usage_percent"
        color="#3b82f6"
        icon={<Cpu className="h-4 w-4 text-blue-400" />}
        data={data}
        range={range}
        isLoading={isLoading}
      />
      <MetricChart
        title="RAM Usage"
        description="Average memory utilization"
        dataKey="memory_usage_percent"
        color="#22c55e"
        icon={<MemoryStick className="h-4 w-4 text-green-400" />}
        data={data}
        range={range}
        isLoading={isLoading}
      />
      <MetricChart
        title="Disk Usage"
        description="Average disk utilization"
        dataKey="disk_usage_percent"
        color="#f97316"
        icon={<HardDrive className="h-4 w-4 text-orange-400" />}
        data={data}
        range={range}
        isLoading={isLoading}
      />
    </div>
  )
}
