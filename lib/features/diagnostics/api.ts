import { fetchWithAuth } from "@/lib/api/fetch-client";
import type {
  LogDiagnostic,
  CollectDiagnosticPayload,
} from "./types";

export async function collectLogDiagnostic(
  payload: CollectDiagnosticPayload
): Promise<{ success: boolean; diagnostic: LogDiagnostic; message: string }> {
  const res = await fetchWithAuth("/api/diagnostics/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to initiate log collection");
  }
  return res.json();
}

export async function getLogDiagnostic(id: string): Promise<LogDiagnostic> {
  const res = await fetchWithAuth(`/api/diagnostics/${id}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch diagnostic");
  }
  const data = await res.json();
  return data.diagnostic;
}

export async function listLogDiagnostics(params?: {
  nodeId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ diagnostics: LogDiagnostic[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.nodeId) q.set("node_id", params.nodeId);
  if (params?.status) q.set("status", params.status);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));

  const url = `/api/diagnostics${q.toString() ? `?${q.toString()}` : ""}`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to list diagnostics");
  }
  return res.json();
}

export async function approveLogDiagnostic(id: string): Promise<void> {
  const res = await fetchWithAuth(`/api/diagnostics/${id}/approve`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to approve diagnostic");
  }
}

export async function rejectLogDiagnostic(id: string): Promise<void> {
  const res = await fetchWithAuth(`/api/diagnostics/${id}/reject`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to reject diagnostic");
  }
}

export async function deleteLogDiagnostic(id: string): Promise<void> {
  const res = await fetchWithAuth(`/api/diagnostics/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete diagnostic");
  }
}

/**
 * Polls for a diagnostic preview until its status changes from 'pending'
 * to 'preview' (or 'approved'/'rejected') or timeout occurs.
 */
export async function pollDiagnosticPreview(
  id: string,
  timeoutMs: number = 30000,
  intervalMs: number = 1500
): Promise<LogDiagnostic> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const diag = await getLogDiagnostic(id);
    if (diag.status !== "pending") {
      return diag;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timeout waiting for diagnostic processing.");
}
