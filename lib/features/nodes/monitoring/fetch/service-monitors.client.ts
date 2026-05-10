import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_MONITOR_ENDPOINTS } from "./constants";
import type { UpsertServiceMonitorPayload } from "../interfaces/service-monitor";

export async function fetchServiceMonitors(nodeId: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_MONITOR_ENDPOINTS.SERVICE_MONITORS.BY_NODE(nodeId), {
    method: "GET",
  });
}

export async function fetchCreateServiceMonitor(
  nodeId: string,
  payload: UpsertServiceMonitorPayload
): Promise<Response> {
  return fetchWithAuth(CLIENT_API_MONITOR_ENDPOINTS.SERVICE_MONITORS.BY_NODE(nodeId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchUpdateServiceMonitor(
  nodeId: string,
  monitorId: string,
  payload: UpsertServiceMonitorPayload
): Promise<Response> {
  return fetchWithAuth(
    CLIENT_API_MONITOR_ENDPOINTS.SERVICE_MONITORS.DETAIL(nodeId, monitorId),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchDeleteServiceMonitor(
  nodeId: string,
  monitorId: string
): Promise<Response> {
  return fetchWithAuth(
    CLIENT_API_MONITOR_ENDPOINTS.SERVICE_MONITORS.DETAIL(nodeId, monitorId),
    { method: "DELETE" }
  );
}

export async function fetchUptimeHistory(nodeId: string, monitorId: string): Promise<Response> {
  return fetchWithAuth(
    CLIENT_API_MONITOR_ENDPOINTS.SERVICE_MONITORS.UPTIME(nodeId, monitorId),
    { method: "GET" }
  );
}
