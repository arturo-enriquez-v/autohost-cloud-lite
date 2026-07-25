// ─── Node & metrics ───────────────────────────────────────────────────────────

export type NodeStatus = "online" | "offline";
export type ContainerStatus = "running" | "stopped";

export interface Container {
  name: string;
  status: ContainerStatus;
}

export interface Node {
  id: string;
  name: string;
  hostname?: string;
  status: NodeStatus;
  cpu: number;
  ram: number;
  disk: number;
  containers: Container[];
  ipLocal?: string;
  os?: string;
  arch?: string;
  versionAgent?: string;
  projectId?: string;
  lastSeenAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NodeBackendResponse {
  ID: string;
  Hostname: string;
  IPLocal: string;
  OS: string;
  Arch: string;
  VersionAgent: string;
  OwnerID: string;
  LastSeenAt: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface NodeMetric {
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
  collected_at: string;
}

export interface NodeMetricHistoryPoint {
  bucket: string;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
}

export interface NodeWithMetricsBackendResponse {
  id: string;
  hostname: string;
  ip_local: string;
  os: string;
  arch: string;
  version_agent: string;
  owner_id: string;
  project_id?: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  last_metric?: NodeMetric;
}

// ─── Live metric (SSE feed) ───────────────────────────────────────────────────

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

// ─── Metric range (history charts) ───────────────────────────────────────────

export type MetricRange = "1d" | "7d" | "30d";

export const METRIC_RANGE_CONFIG: Record<MetricRange, { days: number; bucket: string; label: string }> = {
  "1d": { days: 1, bucket: "minute", label: "Last 24h" },
  "7d": { days: 7, bucket: "hour", label: "Last 7 days" },
  "30d": { days: 30, bucket: "day", label: "Last 30 days" },
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "running" | "completed" | "failed";
export type JobCommandType = "default" | "custom";

export interface JobBackendResponse {
  ID: string;
  NodeID: string;
  CommandName: string;
  CommandType: JobCommandType;
  Status: JobStatus;
  Output: string;
  Error: string;
  CreatedAt: string;
  StartedAt: string | null;
  FinishedAt: string | null;
}

export interface Job {
  id: string;
  nodeId: string;
  commandName: string;
  commandType: JobCommandType;
  status: JobStatus;
  output: string;
  error: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

// ─── Docker containers ────────────────────────────────────────────────────────

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  /** "running" | "exited" | "paused" | "restarting" | ... */
  state: string;
  /** Human-readable status, e.g. "Up 2 hours" or "Exited (0) 5 minutes ago" */
  status: string;
  /** CPU usage percentage — only present for running containers */
  cpu?: string;
  /** Memory usage/limit — only present for running containers */
  mem?: string;
  /** Memory usage percentage — only present for running containers */
  memPerc?: string;
}

export type ContainerAction = "start" | "stop" | "restart" | "stats";

// ─── Node commands ────────────────────────────────────────────────────────────

export type CommandType = "default" | "custom";

export interface NodeCommandBackendResponse {
  ID: string;
  NodeID: string;
  Name: string;
  Description: string;
  Type: CommandType;
  ScriptPath: string;
  CreatedAt: string;
}

export interface NodeCommand {
  id: string;
  nodeId: string;
  name: string;
  description: string;
  type: CommandType;
  scriptPath: string;
  createdAt: string;
}

// ─── Node alerts ──────────────────────────────────────────────────────────────

export interface NodeAlertConfig {
  id?: string;
  nodeId: string;
  telegramBotId?: string | null;
  telegramBotToken: string;
  telegramChatId: string;
  cpuThreshold: number | null;
  ramThreshold: number | null;
  diskThreshold: number | null;
  alertOnOffline: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NodeAlertConfigBackendResponse {
  id?: string;
  node_id: string;
  telegram_bot_id?: string | null;
  telegram_bot_token: string;
  telegram_chat_id: string;
  cpu_threshold: number | null;
  ram_threshold: number | null;
  disk_threshold: number | null;
  alert_on_offline: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── Caddy routes ─────────────────────────────────────────────────────────────

export interface CaddyRoute {
  id: string;
  nodeId: string;
  userId: string;
  domain: string;
  upstream: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaddyRouteBackendResponse {
  id: string;
  node_id: string;
  user_id: string;
  domain: string;
  upstream: string;
  created_at: string;
  updated_at: string;
}

/** A route as reported live by the agent (includes Caddyfile-defined routes). */
export interface LiveCaddyRoute {
  domain: string;
  upstream: string;
  /** true = managed by autohost, false = defined externally (e.g. Caddyfile) */
  managed: boolean;
}

// ─── Service monitors ─────────────────────────────────────────────────────────

export type CheckType = "process" | "tcp" | "http";
export type MonitorStatus = "healthy" | "degraded" | "down" | "unknown";
export type HealthEventStatus = "up" | "down";
export type UptimeBucket = "up" | "down" | "no_data";

export interface ServiceMonitorBackendResponse {
  id: string;
  node_id: string;
  user_id: string;
  service_name: string;
  check_type: CheckType;
  http_url: string;
  http_expected_status: number;
  tcp_host: string;
  tcp_port: number;
  interval_seconds: number;
  failure_threshold: number;
  notify_telegram: boolean;
  enabled: boolean;
  status: MonitorStatus;
  consecutive_failures: number;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceHealthEventBackendResponse {
  id: string;
  monitor_id: string;
  node_id: string;
  user_id: string;
  status: HealthEventStatus;
  latency_ms: number;
  message: string;
  checked_at: string;
}

export interface UptimePointBackendResponse {
  bucket: string;
  status: UptimeBucket;
}

export interface ServiceMonitor {
  id: string;
  nodeId: string;
  userId: string;
  serviceName: string;
  checkType: CheckType;
  httpUrl: string;
  httpExpectedStatus: number;
  tcpHost: string;
  tcpPort: number;
  intervalSeconds: number;
  failureThreshold: number;
  notifyTelegram: boolean;
  enabled: boolean;
  status: MonitorStatus;
  consecutiveFailures: number;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceHealthEvent {
  id: string;
  monitorId: string;
  nodeId: string;
  status: HealthEventStatus;
  latencyMs: number;
  message: string;
  checkedAt: string;
}

export interface UptimePoint {
  bucket: string;
  status: UptimeBucket;
}

export type UpsertServiceMonitorPayload = Omit<
  ServiceMonitor,
  "id" | "userId" | "status" | "consecutiveFailures" | "lastCheckedAt" | "createdAt" | "updatedAt"
>;

// ─── Log entries (SSE feed) ───────────────────────────────────────────────────

export interface LogEntry {
  timestamp_us: number;
  unit: string;
  message: string;
}
