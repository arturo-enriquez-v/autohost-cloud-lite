// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { API_PLAN_ENDPOINTS } from "./constants"
import { backendFetch } from "@/lib/api"

export async function getUserPlanUsageBackend(accessToken: string) {
  return backendFetch(API_PLAN_ENDPOINTS.PLANS.USAGE, { method: "GET" }, accessToken)
}
