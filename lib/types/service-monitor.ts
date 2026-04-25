export type CheckType = "process" | "tcp" | "http";
export type MonitorStatus = "healthy" | "degraded" | "down" | "unknown";
export type HealthEventStatus = "up" | "down";
export type UptimeBucket = "up" | "down" | "no_data";

// ─── Backend response shapes (snake_case) ───────────────────────────────────

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

// ─── Camel-case frontend types ───────────────────────────────────────────────

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
