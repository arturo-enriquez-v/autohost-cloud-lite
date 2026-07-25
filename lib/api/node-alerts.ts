import { API_ENDPOINTS } from "@/config/constants";
import type { NodeAlertConfig, NodeAlertConfigBackendResponse } from "@/lib/types";
import { backendFetch } from "@/lib/api";

export async function getNodeAlertConfigBackend(nodeId: string, accessToken: string) {
  return backendFetch(API_ENDPOINTS.NODE_ALERTS.BY_NODE(nodeId), { method: "GET" }, accessToken);
}

export async function upsertNodeAlertConfigBackend(
  nodeId: string,
  data: Omit<NodeAlertConfig, "id" | "nodeId" | "createdAt" | "updatedAt">,
  accessToken: string
) {
  return backendFetch(
    API_ENDPOINTS.NODE_ALERTS.BY_NODE(nodeId),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegram_bot_id: data.telegramBotId,
        telegram_bot_token: data.telegramBotToken,
        telegram_chat_id: data.telegramChatId,
        cpu_threshold: data.cpuThreshold,
        ram_threshold: data.ramThreshold,
        disk_threshold: data.diskThreshold,
        alert_on_offline: data.alertOnOffline,
      }),
    },
    accessToken
  );
}

export function mapNodeAlertFromBackend(r: NodeAlertConfigBackendResponse): NodeAlertConfig {
  return {
    id: r.id,
    nodeId: r.node_id,
    telegramBotId: r.telegram_bot_id ?? null,
    telegramBotToken: r.telegram_bot_token ?? "",
    telegramChatId: r.telegram_chat_id ?? "",
    cpuThreshold: r.cpu_threshold ?? null,
    ramThreshold: r.ram_threshold ?? null,
    diskThreshold: r.disk_threshold ?? null,
    alertOnOffline: r.alert_on_offline ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
