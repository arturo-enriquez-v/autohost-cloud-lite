export type AlertEventType = "offline" | "cpu" | "ram" | "disk"

export interface AlertEvent {
  id: string
  user_id: string | null
  node_id: string
  alert_type: AlertEventType
  message: string
  created_at: string
}
