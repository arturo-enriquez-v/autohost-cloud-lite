// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

export const CLIENT_API_ASSISTANT_ENDPOINTS = {
  STATUS: "/api/assistant/status",
  CHAT: "/api/assistant/chat",
  SETTINGS: "/api/assistant/settings",
  MODELS: "/api/assistant/models",
} as const;

export const API_ASSISTANT_ENDPOINTS = {
  STATUS: "/v1/assistant/status",
  CHAT: "/v1/assistant/chat",
  SETTINGS: "/v1/assistant/settings",
  MODELS: "/v1/assistant/models",
} as const;
