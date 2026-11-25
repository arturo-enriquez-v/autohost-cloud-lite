// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { NextResponse } from "next/server";
import {
  deleteConnectorBackend,
  getConnectorBackend,
  proxyConnectorCall,
  readJSONBody,
  updateConnectorBackend,
} from "@/lib/features/connectors/fetch/connectors.server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return proxyConnectorCall((token) => getConnectorBackend(id, token), "Failed to load connector");
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJSONBody(req);
  if (!body) return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  return proxyConnectorCall((token) => updateConnectorBackend(id, body, token), "Failed to update connector");
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return proxyConnectorCall((token) => deleteConnectorBackend(id, token), "Failed to delete connector");
}
