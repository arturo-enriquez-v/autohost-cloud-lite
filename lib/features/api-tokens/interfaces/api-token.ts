// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

// Shapes from autohost-cloud-api/api/openapi.yaml (APIToken, CreateAPITokenRequest, CreatedAPIToken).

export type ApiTokenScope = "read" | "custom" | "write";

export interface ApiToken {
  id: string;
  name: string;
  token_prefix: string;
  scope: ApiTokenScope;
  // TODO: optional while APIs without per-token permissions are deployed (they omit the field).
  permissions?: string[];
  expires_at: string;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
}

export interface CreateApiTokenInput {
  name: string;
  scope: ApiTokenScope;
  permissions?: string[];
  expires_in_days?: number;
}

export interface CreatedApiToken {
  token: string;
  api_token: ApiToken;
}
