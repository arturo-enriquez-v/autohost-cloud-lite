// Node & metrics
export type {
  Node,
  NodeStatus,
  NodeMetric,
  NodeMetricHistoryPoint,
  NodeBackendResponse,
  NodeWithMetricsBackendResponse,
} from "@/lib/types/node";

// Jobs
export type { Job, JobStatus, JobCommandType, JobBackendResponse } from "@/lib/types/job";

// Containers
export type { DockerContainer } from "@/lib/types/container";

// Commands
export type { NodeCommand, CommandType, NodeCommandBackendResponse } from "@/lib/types/node-command";

// Alerts
export type { NodeAlertConfig, NodeAlertConfigBackendResponse } from "@/lib/types/node-alert";

// Live metric (defined here since it's specific to the SSE feed)
export interface LiveMetric {
  cpu_usage_percent: number;
  ram_total_bytes: number;
  ram_used_bytes: number;
  ram_available_bytes: number;
  ram_usage_percent: number;
  disk_total_bytes: number;
  disk_used_bytes: number;
  disk_available_bytes: number;
  disk_usage_percent: number;
  uptime_seconds: number;
  collected_at: string;
}

// Metric range for history charts
export type MetricRange = "1d" | "7d" | "30d";

export const METRIC_RANGE_CONFIG: Record<MetricRange, { days: number; bucket: string; label: string }> = {
  "1d": { days: 1, bucket: "minute", label: "Last 24h" },
  "7d": { days: 7, bucket: "hour", label: "Last 7 days" },
  "30d": { days: 30, bucket: "day", label: "Last 30 days" },
};

// Container actions
export type ContainerAction = "start" | "stop" | "restart" | "stats";
