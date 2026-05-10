import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_ALERT_ENDPOINTS } from "./constants";

export async function fetchAlertEvents(limit = 50, offset = 0): Promise<Response> {
  return fetchWithAuth(
    `${CLIENT_API_ALERT_ENDPOINTS.ALERT_EVENTS.LIST}?limit=${limit}&offset=${offset}`,
    { method: "GET" },
  );
}
