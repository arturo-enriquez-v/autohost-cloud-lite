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
  cpuTempCelsius?: number;
  isLocal?: boolean;
  isVm?: boolean;
  vmId?: string;
  hostNodeId?: string;
  hostHostname?: string;
  containers: Container[];
  ipLocal?: string;
  ipVpn?: string;
  os?: string;
  arch?: string;
  versionAgent?: string;
  projectId?: string;
  lastSeenAt?: string;
  createdAt?: string;
  updatedAt?: string;
  /** RBAC: effective preset of the current user on this node (viewer/operator/editor/custom/admin). */
  rolePreset?: string;
  /** RBAC: effective granular permissions of the current user on this node ("*" = all). */
  permissions?: string[];
}

export interface NodeBackendResponse {
  ID: string;
  Hostname: string;
  IPLocal: string;
  IPVPN?: string;
  OS: string;
  Arch: string;
  VersionAgent: string;
  OwnerID: string;
  IsLocal?: boolean;
  LastSeenAt: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface NodeMetric {
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
  cpu_temp_celsius?: number;
  collected_at: string;
}

export interface NodeMetricHistoryPoint {
  bucket: string;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
  cpu_temp_celsius?: number;
}

export interface NodeWithMetricsBackendResponse {
  id: string;
  hostname: string;
  ip_local: string;
  ip_vpn?: string;
  os: string;
  arch: string;
  version_agent: string;
  owner_id: string;
  project_id?: string;
  is_local?: boolean;
  is_vm?: boolean;
  vm_id?: string;
  host_node_id?: string;
  host_hostname?: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  last_metric?: NodeMetric;
  role_preset?: string;
  permissions?: string[];
}

// ─── Live metric (SSE feed) ───────────────────────────────────────────────────

export interface LiveMetric {
  cpu_usage_percent: number;
  memory_total_bytes: number;
  memory_used_bytes: number;
  memory_available_bytes: number;
  memory_usage_percent: number;
  disk_total_bytes: number;
  disk_used_bytes: number;
  disk_available_bytes: number;
  disk_usage_percent: number;
  uptime_seconds: number;
  cpu_temp_celsius?: number;
  collected_at: string;
}

// ─── Metric range (history charts) ───────────────────────────────────────────

export type MetricRange = "1d" | "7d" | "30d";

export const METRIC_RANGE_CONFIG: Record<MetricRange, { days: number; bucket: string; label: string }> = {
  "1d": { days: 1, bucket: "minute", label: "Last 24h" },
  "7d": { days: 7, bucket: "hour", label: "Last 7 days" },
  "30d": { days: 30, bucket: "day", label: "Last 30 days" },
};

export interface ContainerMetricHistoryPoint {
  bucket: string;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  memory_usage_bytes: number;
  state: string;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "running" | "completed" | "failed";
export type JobCommandType = "default" | "custom";

export interface JobBackendResponse {
  id: string;
  node_id: string;
  command_name: string;
  command_type: JobCommandType;
  status: JobStatus;
  output: string;
  error: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
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
  /** Ports published on the host; missing from older agents (see containerPorts) */
  ports?: ContainerPort[];
}

export interface ContainerPort {
  /** Port on the host */
  public: number;
  /** Port inside the container */
  private: number;
  /** "tcp" | "udp" | "sctp" */
  protocol: string;
}

export type ContainerAction = "start" | "stop" | "restart" | "remove" | "stats";

// ─── Node commands ────────────────────────────────────────────────────────────

export type CommandType = "default" | "custom";

export interface NodeCommandBackendResponse {
  id: string;
  node_id: string;
  name: string;
  description: string;
  type: CommandType;
  script_path: string;
  created_at: string;
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

export type CaddyTLSMode = "auto" | "internal" | "http_only";

export interface CaddyRoute {
  id: string;
  nodeId: string;
  userId: string;
  domain: string;
  upstream: string;
  tlsMode?: CaddyTLSMode;
  createdAt: string;
  updatedAt: string;
}

export interface CaddyRouteBackendResponse {
  id: string;
  node_id: string;
  user_id: string;
  domain: string;
  upstream: string;
  tls_mode?: CaddyTLSMode;
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

export type { AutoHealConfig, ServiceStatus, ServiceHealthState } from "./monitoring/auto-heal";
import type { AutoHealConfig, ServiceHealthState } from "./monitoring/auto-heal";

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
  /** Enabled but without recent results (node offline); `status` is out of date. Missing on older APIs. */
  stale?: boolean;
  /** Latest check result; missing on older APIs. */
  last_message?: string;
  last_latency_ms?: number;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
  auto_heal_config?: AutoHealConfig;
  auto_heal_state?: ServiceHealthState;
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
  /** Checks that passed / failed in the bucket; missing on older APIs. */
  up?: number;
  down?: number;
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
  /** Enabled but without recent results (node offline); `status` is out of date. */
  stale: boolean;
  /** Detail of the latest check ("HTTP 200", "container state: exited"); "" if unknown. */
  lastMessage: string;
  lastLatencyMs: number;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
  autoHealConfig?: AutoHealConfig;
  autoHealState?: ServiceHealthState;
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
  /** Checks that passed / failed in the bucket, or null when the API does not report them. */
  up: number | null;
  down: number | null;
}

export interface MonitorStatsBucketBackendResponse {
  bucket: string;
  passed: number;
  failed: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
}

export interface MonitorStatsBackendResponse {
  range: MetricRange;
  from: string;
  bucket_seconds: number;
  summary: {
    checks: number;
    passed: number;
    failed: number;
    uptime_percent: number | null;
    avg_latency_ms: number | null;
    p95_latency_ms: number | null;
    incidents: number;
  };
  buckets: MonitorStatsBucketBackendResponse[];
}

export interface MonitorIncidentBackendResponse {
  started_at: string;
  last_failed_at: string;
  resolved_at: string | null;
  failed_checks: number;
  message: string;
}

/** A monitor's checks over a range. Latencies count passed checks only; null when none passed. */
export interface MonitorStats {
  range: MetricRange;
  from: string;
  bucketSeconds: number;
  summary: {
    checks: number;
    passed: number;
    failed: number;
    uptimePercent: number | null;
    avgLatencyMs: number | null;
    p95LatencyMs: number | null;
    incidents: number;
  };
  buckets: {
    bucket: string;
    passed: number;
    failed: number;
    avgLatencyMs: number | null;
    p95LatencyMs: number | null;
  }[];
}

/** A time the monitor was down: failed checks in a row reaching its threshold. */
export interface MonitorIncident {
  startedAt: string;
  lastFailedAt: string;
  /** First passed check after it; null while ongoing. */
  resolvedAt: string | null;
  failedChecks: number;
  message: string;
}

export type UpsertServiceMonitorPayload = Omit<
  ServiceMonitor,
  | "id"
  | "userId"
  | "status"
  | "consecutiveFailures"
  | "stale"
  | "lastMessage"
  | "lastLatencyMs"
  | "lastCheckedAt"
  | "createdAt"
  | "updatedAt"
  // Only the agent writes the auto-heal state; the API ignores it in requests.
  | "autoHealState"
>;

// ─── Log entries (SSE feed) ───────────────────────────────────────────────────

export interface LogEntry {
  timestamp_us: number;
  unit: string;
  message: string;
}

// ─── Hypervisor (Virtualization capacity) ─────────────────────────────────────

export interface HypervisorInfo {
  capable: boolean;
  kvm_available: boolean;
  libvirt_available: boolean;
  libvirt_version: string;
  reason?: string;
  network_name: string;
  cpu_cores: number;
  ram_total_bytes: number;
  storage_total_bytes: number;
  storage_available_bytes: number;
  reported_at: string;
}

export interface HypervisorResponse {
  reported: boolean;
  info?: HypervisorInfo;
}

// ─── Virtual Machines ────────────────────────────────────────────────────────

export type VMStatus = "provisioning" | "running" | "stopped" | "error" | 'creating';

export interface VirtualMachine {
  id: string;
  host_node_id: string;
  node_id?: string | null;
  owner_id: string;
  name: string;
  vcpus: number;
  ram_mb: number;
  disk_gb: number;
  image: string;
  status: VMStatus;
  ip_address?: string | null;
  cloud_init_user?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVMRequest {
  name: string;
  vcpus: number;
  ram_mb: number;
  disk_gb: number;
  image: string;
  cloud_init_user?: string;
  ssh_keys?: string[];
}

