export interface Plan {
  id: string
  name: string
  description?: string
  price_cents: number
  max_nodes: number
  max_projects: number
  max_custom_commands: number
  retention_days: number
  polling_interval_sec: number
  max_backup_storage_bytes?: number
  max_backup_retention_days?: number
  max_ai_diagnostics_per_month?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  status: string
  period_start: string
  period_end?: string
  stripe_subscription_id?: string
  stripe_customer_id?: string
  created_at: string
  updated_at: string
}

export interface UserPlan {
  subscription: Subscription
  plan: Plan
}

export interface PlanUsage {
  plan: Plan
  nodes_count: number
  nodes_limit: number
  projects_count: number
  projects_limit: number
  custom_commands_count: number
  custom_commands_limit: number
  backup_storage_bytes: number
  backup_storage_limit_bytes: number
  backup_retention_days_limit: number
  ai_diagnostics_this_month: number
  ai_diagnostics_month_limit: number
}
