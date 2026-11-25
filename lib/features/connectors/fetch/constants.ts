// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

export const CLIENT_API_CONNECTOR_ENDPOINTS = {
  LIST: "/api/connectors",
  TEST: "/api/connectors/test",
  DETAIL: (id: string) => `/api/connectors/${encodeURIComponent(id)}`,
  RUN: (id: string) => `/api/connectors/${encodeURIComponent(id)}/run`,
  RUNS: (id: string) => `/api/connectors/${encodeURIComponent(id)}/runs`,
} as const;

export const API_CONNECTOR_ENDPOINTS = {
  LIST: "/v1/connectors",
  TEST: "/v1/connectors/test",
  DETAIL: (id: string) => `/v1/connectors/${encodeURIComponent(id)}`,
  RUN: (id: string) => `/v1/connectors/${encodeURIComponent(id)}/run`,
  RUNS: (id: string) => `/v1/connectors/${encodeURIComponent(id)}/runs`,
} as const;
