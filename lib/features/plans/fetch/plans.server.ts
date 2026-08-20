import { API_PLAN_ENDPOINTS } from "./constants"
import { backendFetch } from "@/lib/api"

export async function getPlansBackend(accessToken?: string) {
  return backendFetch(API_PLAN_ENDPOINTS.PLANS.LIST, { method: "GET" }, accessToken)
}

export async function getUserPlanBackend(accessToken: string) {
  return backendFetch(API_PLAN_ENDPOINTS.PLANS.MY_PLAN, { method: "GET" }, accessToken)
}

export async function getUserPlanUsageBackend(accessToken: string) {
  return backendFetch(API_PLAN_ENDPOINTS.PLANS.USAGE, { method: "GET" }, accessToken)
}

export async function changePlanBackend(planId: string, accessToken: string) {
  return backendFetch(
    API_PLAN_ENDPOINTS.PLANS.MY_PLAN,
    {
      method: "PUT",
      body: JSON.stringify({ plan_id: planId }),
    },
    accessToken
  )
}
