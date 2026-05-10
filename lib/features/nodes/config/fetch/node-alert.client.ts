import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_ALERT_ENDPOINTS } from "./constants";
import type { NodeAlertConfig } from "../interfaces/node-alert";

export async function fetchNodeAlertConfig(nodeId: string): Promise<NodeAlertConfig | null> {
  const res = await fetchWithAuth(CLIENT_API_ALERT_ENDPOINTS.NODE_ALERTS.BY_NODE(nodeId));
  if (!res.ok) return null;
  return res.json();
}

export async function saveNodeAlertConfig(
  nodeId: string,
  data: Omit<NodeAlertConfig, "id" | "nodeId" | "createdAt" | "updatedAt">
): Promise<NodeAlertConfig> {
  const res = await fetchWithAuth(CLIENT_API_ALERT_ENDPOINTS.NODE_ALERTS.BY_NODE(nodeId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, nodeId }),
  });
  if (!res.ok) throw new Error("Failed to save alert config");
  return res.json();
}
