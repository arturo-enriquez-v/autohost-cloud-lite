// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { forwardBackendError } from "@/lib/features/api-tokens/fetch/api-tokens.server";
import { API_CONNECTOR_ENDPOINTS as EP } from "./constants";

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function listConnectorsBackend(accessToken: string, projectId?: string | null) {
  const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  return backendFetch(EP.LIST + qs, { method: "GET" }, accessToken);
}

export function createConnectorBackend(body: unknown, accessToken: string) {
  return backendFetch(EP.LIST, json("POST", body), accessToken);
}

export function getConnectorBackend(id: string, accessToken: string) {
  return backendFetch(EP.DETAIL(id), { method: "GET" }, accessToken);
}

export function updateConnectorBackend(id: string, body: unknown, accessToken: string) {
  return backendFetch(EP.DETAIL(id), json("PUT", body), accessToken);
}

export function deleteConnectorBackend(id: string, accessToken: string) {
  return backendFetch(EP.DETAIL(id), { method: "DELETE" }, accessToken);
}

export function runConnectorBackend(id: string, body: unknown, accessToken: string) {
  return backendFetch(EP.RUN(id), json("POST", body), accessToken);
}

export function testConnectorBackend(body: unknown, accessToken: string) {
  return backendFetch(EP.TEST, json("POST", body), accessToken);
}

export function listConnectorRunsBackend(id: string, accessToken: string, limit?: string | null) {
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";
  return backendFetch(EP.RUNS(id) + qs, { method: "GET" }, accessToken);
}

/**
 * Runs a backend call with the session token and forwards the answer: the JSON body and status on success
 * (204 without body), {"error": "..."} with the backend status on failure. Results are not cached: they
 * can carry data from external APIs.
 */
export async function proxyConnectorCall(
  call: (accessToken: string) => Promise<Response>,
  fallback: string
): Promise<NextResponse> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const res = await call(accessToken);
    if (!res.ok) return forwardBackendError(res, fallback);
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await res.json(), {
      status: res.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Reads a JSON request body; null when it is not valid JSON. An empty body is {}. */
export async function readJSONBody(req: Request): Promise<unknown | null> {
  const text = await req.text().catch(() => null);
  if (text === null) return null;
  if (text.trim() === "") return {};
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
