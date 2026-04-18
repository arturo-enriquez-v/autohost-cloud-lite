import { API_ENDPOINTS } from "@/config/constants";
import { backendFetch } from "../api";

export async function listAlertEventsBackend(
  accessToken: string,
  limit = 50,
  offset = 0
) {
  return backendFetch(
    `${API_ENDPOINTS.ALERT_EVENTS.LIST}?limit=${limit}&offset=${offset}`,
    { method: "GET" },
    accessToken
  );
}
