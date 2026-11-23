// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_TOKEN_ENDPOINTS } from "./constants";
import type { CreateApiTokenInput } from "../interfaces/api-token";

export async function fetchApiTokens(): Promise<Response> {
  return fetchWithAuth(CLIENT_API_TOKEN_ENDPOINTS.LIST, { method: "GET" });
}

export async function fetchCreateApiToken(data: CreateApiTokenInput): Promise<Response> {
  return fetchWithAuth(CLIENT_API_TOKEN_ENDPOINTS.LIST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function fetchRevokeApiToken(id: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_TOKEN_ENDPOINTS.DETAIL(id), { method: "DELETE" });
}
