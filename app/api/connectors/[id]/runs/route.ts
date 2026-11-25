// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import {
  listConnectorRunsBackend,
  proxyConnectorCall,
} from "@/lib/features/connectors/fetch/connectors.server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limit = new URL(req.url).searchParams.get("limit");
  return proxyConnectorCall((token) => listConnectorRunsBackend(id, token, limit), "Failed to load runs");
}
