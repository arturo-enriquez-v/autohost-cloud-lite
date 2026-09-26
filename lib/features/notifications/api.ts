import { fetchWithAuth } from "@/lib/api/fetch-client";

export interface NotificationAlertItem {
  id: string;
  node_id: string;
  node_name?: string;
  alert_type: string;
  message: string;
  created_at: string;
}

export interface NotificationLogItem {
  id: string;
  node_id?: string;
  node_name?: string;
  title: string;
  level: string;
  message?: string;
  created_at: string;
}

export interface NotificationSummary {
  unread_alerts_count: number;
  unread_logs_count: number;
  total_unread: number;
  last_seen_alerts_at: string;
  last_seen_logs_at: string;
  recent_alerts: NotificationAlertItem[];
  recent_logs: NotificationLogItem[];
}

export async function fetchNotificationSummary(): Promise<NotificationSummary> {
  const res = await fetchWithAuth("/api/notifications/summary", { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to fetch notification summary");
  }
  return res.json();
}

export async function acknowledgeNotifications(scope: "alerts" | "logs" | "all"): Promise<void> {
  const res = await fetchWithAuth("/api/notifications/ack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope }),
  });
  if (!res.ok) {
    throw new Error("Failed to acknowledge notifications");
  }
}
