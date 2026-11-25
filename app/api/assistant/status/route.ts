// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { API_ASSISTANT_ENDPOINTS, proxyAssistantJSON } from "@/lib/features/assistant/fetch/assistant.server";

export const dynamic = "force-dynamic";

export function GET() {
  return proxyAssistantJSON(API_ASSISTANT_ENDPOINTS.STATUS, { method: "GET" }, "Failed to load the assistant status");
}
