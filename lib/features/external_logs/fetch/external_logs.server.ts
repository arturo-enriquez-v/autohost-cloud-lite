import { backendFetch } from "@/lib/api";

export async function listExternalLogsBackend(
  accessToken: string,
  limit = 50,
  offset = 0,
  filter?: { nodeId?: string; level?: string; tag?: string; search?: string; from?: string; to?: string }
) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (filter?.nodeId) params.append("node_id", filter.nodeId);
  if (filter?.level) params.append("level", filter.level);
  if (filter?.tag) params.append("tag", filter.tag);
  if (filter?.search) params.append("search", filter.search);
  if (filter?.from) params.append("from", filter.from);
  if (filter?.to) params.append("to", filter.to);

  return backendFetch(`/v1/external-logs?${params.toString()}`, { method: "GET" }, accessToken);
}

export async function clearExternalLogsBackend(accessToken: string) {
  return backendFetch("/v1/external-logs", { method: "DELETE" }, accessToken);
}

export async function deleteExternalLogBackend(accessToken: string, logId: string) {
  return backendFetch(`/v1/external-logs/${logId}`, { method: "DELETE" }, accessToken);
}

export async function listExternalLogTokensBackend(accessToken: string) {
  return backendFetch("/v1/external-log-tokens", { method: "GET" }, accessToken);
}

export async function createExternalLogTokenBackend(
  accessToken: string,
  name: string,
  nodeId?: string
) {
  return backendFetch(
    "/v1/external-log-tokens",
    {
      method: "POST",
      body: JSON.stringify({ name, node_id: nodeId || undefined }),
    },
    accessToken
  );
}

export async function revokeExternalLogTokenBackend(accessToken: string, tokenId: string) {
  return backendFetch(`/v1/external-log-tokens/${tokenId}`, { method: "DELETE" }, accessToken);
}
