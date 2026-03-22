export interface NodeAlertConfig {
  id?: string
  nodeId: string
  telegramBotToken: string
  telegramChatId: string
  cpuThreshold: number | null
  ramThreshold: number | null
  diskThreshold: number | null
  alertOnOffline: boolean
  createdAt?: string
  updatedAt?: string
}

export interface NodeAlertConfigBackendResponse {
  id?: string
  node_id: string
  telegram_bot_token: string
  telegram_chat_id: string
  cpu_threshold: number | null
  ram_threshold: number | null
  disk_threshold: number | null
  alert_on_offline: boolean
  created_at?: string
  updated_at?: string
}
