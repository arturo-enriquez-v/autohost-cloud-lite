import { API_MONITOR_ENDPOINTS } from "./constants";
import type {
  MonitorIncident,
  MonitorIncidentBackendResponse,
  MonitorStats,
  MonitorStatsBackendResponse,
  MetricRange,
} from "@/lib/features/nodes/types";
import type {
  ServiceMonitor,
  ServiceMonitorBackendResponse,
  ServiceHealthEventBackendResponse,
  ServiceHealthEvent,
  UptimePoint,
  UptimePointBackendResponse,
  UpsertServiceMonitorPayload,
} from "@/lib/types";
import { backendFetch } from "@/lib/api";

// ─── Errors ───────────────────────────────────────────────────────────────────

/** Reads an API error, which may be JSON (`{"error": ...}`) or plain text, as `{ error }`. */
export async function readBackendError(res: Response, fallback: string): Promise<{ error: string }> {
  const text = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.error === "string" && parsed.error) return { error: parsed.error };
  } catch {
    // Plain-text error.
  }
  return { error: text.trim() || fallback };
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function mapMonitorFromBackend(r: ServiceMonitorBackendResponse): ServiceMonitor {
  return {
    id: r.id,
    nodeId: r.node_id,
    userId: r.user_id,
    serviceName: r.service_name,
    checkType: r.check_type,
    httpUrl: r.http_url ?? "",
    httpExpectedStatus: r.http_expected_status ?? 200,
    tcpHost: r.tcp_host ?? "",
    tcpPort: r.tcp_port ?? 0,
    intervalSeconds: r.interval_seconds ?? 30,
    failureThreshold: r.failure_threshold ?? 3,
    notifyTelegram: r.notify_telegram ?? false,
    enabled: r.enabled ?? true,
    status: r.status ?? "unknown",
    consecutiveFailures: r.consecutive_failures ?? 0,
    stale: r.stale ?? false,
    lastMessage: r.last_message ?? "",
    lastLatencyMs: r.last_latency_ms ?? 0,
    lastCheckedAt: r.last_checked_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    autoHealConfig: r.auto_heal_config,
    autoHealState: r.auto_heal_state,
  };
}

export function mapEventFromBackend(r: ServiceHealthEventBackendResponse): ServiceHealthEvent {
  return {
    id: r.id,
    monitorId: r.monitor_id,
    nodeId: r.node_id,
    status: r.status,
    latencyMs: r.latency_ms,
    message: r.message,
    checkedAt: r.checked_at,
  };
}

export function mapStatsFromBackend(r: MonitorStatsBackendResponse): MonitorStats {
  return {
    range: r.range,
    from: r.from,
    bucketSeconds: r.bucket_seconds,
    summary: {
      checks: r.summary.checks,
      passed: r.summary.passed,
      failed: r.summary.failed,
      uptimePercent: r.summary.uptime_percent,
      avgLatencyMs: r.summary.avg_latency_ms,
      p95LatencyMs: r.summary.p95_latency_ms,
      incidents: r.summary.incidents,
    },
    buckets: (r.buckets ?? []).map((b) => ({
      bucket: b.bucket,
      passed: b.passed,
      failed: b.failed,
      avgLatencyMs: b.avg_latency_ms,
      p95LatencyMs: b.p95_latency_ms,
    })),
  };
}

export function mapIncidentFromBackend(r: MonitorIncidentBackendResponse): MonitorIncident {
  return {
    startedAt: r.started_at,
    lastFailedAt: r.last_failed_at,
    resolvedAt: r.resolved_at,
    failedChecks: r.failed_checks,
    message: r.message,
  };
}

export function mapUptimeFromBackend(r: UptimePointBackendResponse): UptimePoint {
  return { bucket: r.bucket, status: r.status, up: r.up ?? null, down: r.down ?? null };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function listServiceMonitorsBackend(nodeId: string, accessToken: string) {
  return backendFetch(
    `${API_MONITOR_ENDPOINTS.SERVICE_MONITORS.LIST}?nodeId=${nodeId}`,
    { method: "GET" },
    accessToken
  );
}

export async function createServiceMonitorBackend(
  payload: UpsertServiceMonitorPayload,
  accessToken: string
) {
  return backendFetch(
    API_MONITOR_ENDPOINTS.SERVICE_MONITORS.CREATE,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBackendPayload(payload)),
    },
    accessToken
  );
}

export async function updateServiceMonitorBackend(
  id: string,
  payload: UpsertServiceMonitorPayload,
  accessToken: string
) {
  return backendFetch(
    API_MONITOR_ENDPOINTS.SERVICE_MONITORS.UPDATE(id),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBackendPayload(payload)),
    },
    accessToken
  );
}

export async function deleteServiceMonitorBackend(id: string, accessToken: string) {
  return backendFetch(
    API_MONITOR_ENDPOINTS.SERVICE_MONITORS.DELETE(id),
    { method: "DELETE" },
    accessToken
  );
}

export async function getEventHistoryBackend(monitorId: string, limit: number, accessToken: string) {
  return backendFetch(
    `${API_MONITOR_ENDPOINTS.SERVICE_MONITORS.HISTORY(monitorId)}?limit=${limit}`,
    { method: "GET" },
    accessToken
  );
}

export async function getMonitorStatsBackend(monitorId: string, range: MetricRange, accessToken: string) {
  return backendFetch(
    `${API_MONITOR_ENDPOINTS.SERVICE_MONITORS.STATS(monitorId)}?range=${range}`,
    { method: "GET" },
    accessToken
  );
}

export async function getMonitorIncidentsBackend(monitorId: string, range: MetricRange, accessToken: string) {
  return backendFetch(
    `${API_MONITOR_ENDPOINTS.SERVICE_MONITORS.INCIDENTS(monitorId)}?range=${range}`,
    { method: "GET" },
    accessToken
  );
}

export async function checkServiceMonitorNowBackend(monitorId: string, accessToken: string) {
  return backendFetch(
    API_MONITOR_ENDPOINTS.SERVICE_MONITORS.CHECK(monitorId),
    { method: "POST" },
    accessToken
  );
}

export async function getUptimeHistory24hBackend(monitorId: string, accessToken: string) {
  return backendFetch(
    API_MONITOR_ENDPOINTS.SERVICE_MONITORS.UPTIME(monitorId),
    { method: "GET" },
    accessToken
  );
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function toBackendPayload(p: UpsertServiceMonitorPayload) {
  return {
    node_id: p.nodeId,
    service_name: p.serviceName,
    check_type: p.checkType,
    http_url: p.httpUrl,
    http_expected_status: p.httpExpectedStatus,
    tcp_host: p.tcpHost,
    tcp_port: p.tcpPort,
    interval_seconds: p.intervalSeconds,
    failure_threshold: p.failureThreshold,
    notify_telegram: p.notifyTelegram,
    enabled: p.enabled,
    auto_heal_config: p.autoHealConfig,
  };
}
