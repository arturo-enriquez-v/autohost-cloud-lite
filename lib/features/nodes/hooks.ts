/**
 * Single entry-point for all node-domain hooks.
 * Import from here instead of individual files within the feature.
 */

export { useNode } from "@/lib/hooks/useNode";
export { useNodes } from "@/lib/hooks/useNodes";
export { useNodeMetrics, type MetricRange } from "@/lib/hooks/useNodeMetrics";
export { useNodeMetricsLive } from "@/lib/hooks/useNodeMetricsLive";
export { useNodeJobs, useJobDispatch } from "@/lib/hooks/useNodeJobs";
export { useNodeCommands } from "@/lib/hooks/useNodeCommands";
export { useContainers, type ContainerAction } from "@/lib/hooks/useContainers";
export { useNodeLogs, type LogEntry } from "@/lib/hooks/useNodeLogs";
export { useNodeAlerts } from "@/lib/hooks/useNodeAlerts";
export { useServiceMonitors, useUptimeHistory } from "@/lib/hooks/useServiceMonitors";
export { useCaddyRoutes } from "@/lib/hooks/useCaddyRoutes";
export { useCaddyStatus, type CaddyStatusState } from "@/lib/hooks/useCaddyStatus";
