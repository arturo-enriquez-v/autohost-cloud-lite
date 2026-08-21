import { backendFetch } from "@/lib/api";

export async function collectDiagnosticBackend(
  data: {
    node_id: string;
    sources: string[];
    lines_per_source?: number;
    include_containers?: boolean;
  },
  accessToken: string
) {
  return backendFetch(
    "/v1/log-diagnostics/collect",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    accessToken
  );
}

export async function listDiagnosticsBackend(
  accessToken: string,
  params?: {
    node_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  const q = new URLSearchParams();
  if (params?.node_id) q.set("node_id", params.node_id);
  if (params?.status) q.set("status", params.status);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));

  const url = `/v1/log-diagnostics${q.toString() ? `?${q.toString()}` : ""}`;
  return backendFetch(url, { method: "GET" }, accessToken);
}

export async function getDiagnosticBackend(id: string, accessToken: string) {
  return backendFetch(`/v1/log-diagnostics/${id}`, { method: "GET" }, accessToken);
}

export async function approveDiagnosticBackend(id: string, accessToken: string) {
  return backendFetch(`/v1/log-diagnostics/${id}/approve`, { method: "POST" }, accessToken);
}

export async function rejectDiagnosticBackend(id: string, accessToken: string) {
  return backendFetch(`/v1/log-diagnostics/${id}/reject`, { method: "POST" }, accessToken);
}

export async function deleteDiagnosticBackend(id: string, accessToken: string) {
  return backendFetch(`/v1/log-diagnostics/${id}`, { method: "DELETE" }, accessToken);
}
