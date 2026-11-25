// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { NextResponse } from "next/server";
import {
  createConnectorBackend,
  listConnectorsBackend,
  proxyConnectorCall,
  readJSONBody,
} from "@/lib/features/connectors/fetch/connectors.server";

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("project_id");
  return proxyConnectorCall((token) => listConnectorsBackend(token, projectId), "Failed to load connectors");
}

export async function POST(req: Request) {
  const body = await readJSONBody(req);
  if (!body) return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  return proxyConnectorCall((token) => createConnectorBackend(body, token), "Failed to create connector");
}
