// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

export const CLIENT_API_TOKEN_ENDPOINTS = {
  LIST: "/api/api-tokens",
  DETAIL: (id: string) => `/api/api-tokens/${encodeURIComponent(id)}`,
} as const;

export const API_TOKEN_ENDPOINTS = {
  LIST: "/v1/api-tokens",
  DETAIL: (id: string) => `/v1/api-tokens/${encodeURIComponent(id)}`,
} as const;
