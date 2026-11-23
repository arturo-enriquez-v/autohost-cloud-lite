// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import { API_TOKEN_ENDPOINTS } from "./constants";
import type { CreateApiTokenInput } from "../interfaces/api-token";

export async function listApiTokensBackend(accessToken: string) {
  return backendFetch(API_TOKEN_ENDPOINTS.LIST, { method: "GET" }, accessToken);
}

export async function createApiTokenBackend(data: CreateApiTokenInput, accessToken: string) {
  return backendFetch(
    API_TOKEN_ENDPOINTS.LIST,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    accessToken
  );
}

export async function revokeApiTokenBackend(id: string, accessToken: string) {
  return backendFetch(API_TOKEN_ENDPOINTS.DETAIL(id), { method: "DELETE" }, accessToken);
}

/**
 * Forwards a failed backend response as {"error": "..."} with the same status. The API answers some
 * errors as JSON and others (401/403 from its auth middleware) as plain text.
 */
export async function forwardBackendError(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  let message = text;
  try {
    const json = JSON.parse(text);
    message = json.error || json.message || text;
  } catch {}
  return NextResponse.json({ error: message.trim() || fallback }, { status: res.status });
}
