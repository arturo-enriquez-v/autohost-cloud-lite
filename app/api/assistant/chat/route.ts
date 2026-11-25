// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { proxyAssistantChat } from "@/lib/features/assistant/fetch/assistant.server";

// Streamed per request: never cache.
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return proxyAssistantChat(req);
}
