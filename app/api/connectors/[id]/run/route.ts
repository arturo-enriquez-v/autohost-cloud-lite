// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { NextResponse } from "next/server";
import {
  proxyConnectorCall,
  readJSONBody,
  runConnectorBackend,
} from "@/lib/features/connectors/fetch/connectors.server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJSONBody(req);
  if (!body) return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  return proxyConnectorCall((token) => runConnectorBackend(id, body, token), "Failed to run connector");
}
