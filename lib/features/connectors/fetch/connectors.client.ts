// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_CONNECTOR_ENDPOINTS as EP } from "./constants";
import type { ConnectorInput, ConnectorParamValues, ConnectorTestInput } from "../interfaces/connector";

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function fetchConnectors(projectId?: string): Promise<Response> {
  const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  return fetchWithAuth(EP.LIST + qs, { method: "GET" });
}

export function fetchCreateConnector(input: ConnectorInput): Promise<Response> {
  return fetchWithAuth(EP.LIST, json("POST", input));
}

export function fetchUpdateConnector(id: string, input: ConnectorInput): Promise<Response> {
  return fetchWithAuth(EP.DETAIL(id), json("PUT", input));
}

export function fetchDeleteConnector(id: string): Promise<Response> {
  return fetchWithAuth(EP.DETAIL(id), { method: "DELETE" });
}

export function fetchRunConnector(id: string, params: ConnectorParamValues): Promise<Response> {
  return fetchWithAuth(EP.RUN(id), json("POST", { params }));
}

export function fetchTestConnector(input: ConnectorTestInput): Promise<Response> {
  return fetchWithAuth(EP.TEST, json("POST", input));
}

export function fetchConnectorRuns(id: string, limit = 50): Promise<Response> {
  return fetchWithAuth(`${EP.RUNS(id)}?limit=${limit}`, { method: "GET" });
}
