import { API_ENDPOINTS } from "@/config/constants";
import { backendFetch } from "@/lib/api";

export interface AlertFilters {
  nodeId?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

export async function listAlertEventsBackend(
  accessToken: string,
  limit = 20,
  offset = 0,
  filters: AlertFilters = {}
) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (filters.nodeId) params.set("node_id", filters.nodeId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return backendFetch(
    `${API_ENDPOINTS.ALERT_EVENTS.LIST}?${params}`,
    { method: "GET" },
    accessToken
  );
}
