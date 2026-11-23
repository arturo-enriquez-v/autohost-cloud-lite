// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { fetchApiTokens, fetchCreateApiToken, fetchRevokeApiToken } from "../fetch/api-tokens.client";
import type { ApiToken, CreateApiTokenInput, CreatedApiToken } from "../interfaces/api-token";

async function errorMessage(res: Response, fallback: string) {
  const err = await res.json().catch(() => ({}));
  return (err as { error?: string }).error || fallback;
}

export const ApiTokensService = {
  async list(): Promise<ApiToken[]> {
    const res = await fetchApiTokens();
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to load API tokens"));
    const data = (await res.json()) as { api_tokens?: ApiToken[] };
    return data.api_tokens ?? [];
  },

  async create(input: CreateApiTokenInput): Promise<CreatedApiToken> {
    const res = await fetchCreateApiToken(input);
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to create API token"));
    return res.json();
  },

  async revoke(id: string): Promise<void> {
    const res = await fetchRevokeApiToken(id);
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to revoke API token"));
  },
};
