// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { NextResponse } from "next/server";
import {
  proxyConnectorCall,
  readJSONBody,
  testConnectorBackend,
} from "@/lib/features/connectors/fetch/connectors.server";

export async function POST(req: Request) {
  const body = await readJSONBody(req);
  if (!body) return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  return proxyConnectorCall((token) => testConnectorBackend(body, token), "Failed to test connector");
}
