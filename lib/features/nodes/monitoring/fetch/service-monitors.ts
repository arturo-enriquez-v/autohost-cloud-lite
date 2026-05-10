import { API_MONITOR_ENDPOINTS } from "./constants";
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
    lastCheckedAt: r.last_checked_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
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

export function mapUptimeFromBackend(r: UptimePointBackendResponse): UptimePoint {
  return { bucket: r.bucket, status: r.status };
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
  };
}
