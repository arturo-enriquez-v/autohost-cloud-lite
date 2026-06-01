import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_ALERT_ENDPOINTS } from "./constants";
import type { AlertFilters } from "./alert.server";

export async function fetchAlertEvents(
  limit = 20,
  offset = 0,
  filters: AlertFilters = {}
): Promise<Response> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (filters.nodeId) params.set("node_id", filters.nodeId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return fetchWithAuth(
    `${CLIENT_API_ALERT_ENDPOINTS.ALERT_EVENTS.LIST}?${params}`,
    { method: "GET" },
  );
}
