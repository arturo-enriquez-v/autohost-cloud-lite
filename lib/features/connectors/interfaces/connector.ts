// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

// Shapes from autohost-cloud-api/api/openapi.yaml (Connector, ConnectorRequest, ConnectorResult, ConnectorRun).

export type ConnectorKind = "query" | "action";
export type ConnectorMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
export type ConnectorBodyType = "none" | "json" | "form" | "text";
export type ConnectorParamType = "string" | "number" | "boolean";
export type ConnectorAuthType = "none" | "bearer" | "api_key" | "basic";
export type ConnectorView = "json" | "table" | "value" | "list";

export interface ConnectorHeader {
  name: string;
  value: string;
}

export interface ConnectorParam {
  name: string;
  label?: string;
  description?: string;
  type: ConnectorParamType;
  required?: boolean;
  default?: string;
  sensitive?: boolean;
}

export interface ConnectorAuth {
  type: ConnectorAuthType;
  name?: string;
  in?: "header" | "query";
  username?: string;
}

export interface ConnectorFieldMapping {
  label: string;
  path: string;
}

export interface ConnectorResponseMapping {
  root?: string;
  fields?: ConnectorFieldMapping[];
  view?: ConnectorView;
}

export interface ConnectorDefinition {
  project_id: string;
  name: string;
  description: string;
  kind: ConnectorKind;
  method: ConnectorMethod;
  url: string;
  headers: ConnectorHeader[];
  body_type: ConnectorBodyType;
  body: string;
  params: ConnectorParam[];
  auth: ConnectorAuth;
  response: ConnectorResponseMapping;
  cache_ttl_seconds: number;
  timeout_seconds: number;
}

/** Request body for create/update. secret: omitted keeps the stored one, "" clears it. */
export interface ConnectorInput extends ConnectorDefinition {
  secret?: string;
}

export interface Connector extends ConnectorDefinition {
  id: string;
  has_secret: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type ConnectorParamValues = Record<string, string | number | boolean>;

/** Body of POST /connectors/test: the unsaved definition, plus values for its params. */
export interface ConnectorTestInput {
  connector: ConnectorInput;
  /** Connector being edited: the API uses its stored secret when none is sent. */
  connector_id?: string;
  params?: ConnectorParamValues;
}

export interface ConnectorMapped {
  columns: string[];
  rows: unknown[][];
  truncated?: boolean;
}

export interface ConnectorResult {
  ok: boolean;
  status_code: number;
  duration_ms: number;
  content_type?: string;
  body?: unknown;
  truncated?: boolean;
  mapped?: ConnectorMapped;
  mapping_error?: string;
  cached: boolean;
  fetched_at: string;
}

export interface ConnectorRun {
  id: string;
  connector_id: string;
  user_id?: string;
  params: Record<string, string>;
  status_code: number;
  ok: boolean;
  error?: string;
  duration_ms: number;
  created_at: string;
}

/**
 * The API only returns the request details (url, headers, body) to callers with connectors:manage, so a
 * connector with a url is one the caller can edit.
 */
export function canManageConnector(c: Connector): boolean {
  return c.url !== "";
}

/** Methods that change data: their action connectors ask for confirmation before running. */
export function isDestructiveMethod(m: ConnectorMethod): boolean {
  return m === "DELETE" || m === "PUT" || m === "PATCH" || m === "POST";
}
