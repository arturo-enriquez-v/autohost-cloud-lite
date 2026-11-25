// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { NextResponse } from "next/server";
import { API_ASSISTANT_ENDPOINTS, proxyAssistantJSON } from "@/lib/features/assistant/fetch/assistant.server";

export const dynamic = "force-dynamic";

export function GET() {
  return proxyAssistantJSON(API_ASSISTANT_ENDPOINTS.SETTINGS, { method: "GET" }, "Failed to load the assistant settings");
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  return proxyAssistantJSON(
    API_ASSISTANT_ENDPOINTS.SETTINGS,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    "Failed to save the assistant settings"
  );
}
