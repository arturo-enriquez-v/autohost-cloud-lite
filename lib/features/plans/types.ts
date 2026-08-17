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
