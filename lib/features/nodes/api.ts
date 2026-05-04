/**
 * Client-side HTTP functions for the nodes domain.
 * All calls go through Next.js API routes (/api/...) via fetchWithAuth.
 */

import { fetchWithAuth } from "@/lib/api/fetch-client";
import type {
  Node,
  Job,
  JobStatus,
  NodeCommand,
  NodeMetricHistoryPoint,
  NodeAlertConfig,
  DockerContainer,
  LiveMetric,
  MetricRange,
  ContainerAction,
} from "./types";
import { METRIC_RANGE_CONFIG } from "./types";

// ── Nodes ────────────────────────────────────────────────────────────────────

export async function fetchNode(nodeId: string): Promise<Node> {
  const res = await fetchWithAuth(`/api/nodes/${nodeId}`);
  if (!res.ok) throw new Error(`Failed to fetch node: ${res.status}`);
  return res.json();
}

export async function fetchNodesWithMetrics(): Promise<Node[]> {
  const res = await fetchWithAuth("/api/nodes/with-metrics");
  if (!res.ok) throw new Error(`Failed to fetch nodes: ${res.status}`);
  return res.json();
}

export async function updateNode(nodeId: string, hostname: string): Promise<Node> {
  const res = await fetchWithAuth("/api/nodes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: nodeId, hostname }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error al actualizar" }));
    throw new Error(err.error || "Failed to update node");
  }
  return res.json();
}

export async function deleteNode(nodeId: string): Promise<void> {
  const res = await fetchWithAuth(`/api/nodes/${nodeId}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error al eliminar" }));
    throw new Error(err.error || "Failed to delete node");
  }
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export async function fetchNodeJobs(nodeId: string): Promise<Job[]> {
  const res = await fetchWithAuth(`/api/nodes/${nodeId}/jobs`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function fetchJob(jobId: string): Promise<Job> {
  const res = await fetchWithAuth(`/api/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Failed to fetch job ${jobId}`);
  return res.json();
}

export async function dispatchJob(
  nodeId: string,
  commandName: string,
  commandType: string = "custom"
): Promise<Job> {
  const res = await fetchWithAuth(`/api/nodes/${nodeId}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commandName, commandType }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to dispatch job");
  }
  return res.json();
}

/**
 * Dispatch a job and block (polling every 2 s) until it reaches a terminal
 * status or the 30 s timeout is hit.
 */
export async function dispatchAndPoll(
  nodeId: string,
  commandName: string
): Promise<{ output: string; error: string }> {
  const job = await dispatchJob(nodeId, commandName, "default");

  for (let i = 0; i < 15; i++) {
    await new Promise<void>((r) => setTimeout(r, 2000));
    try {
      const updated = await fetchJob(job.id);
      const terminal: JobStatus[] = ["completed", "failed"];
      if (terminal.includes(updated.status)) {
        return { output: updated.output ?? "", error: updated.error ?? "" };
      }
    } catch {
      // ignore transient polling errors
    }
  }
  throw new Error("Timeout: no response from node within 30 s");
}

// ── Commands ─────────────────────────────────────────────────────────────────

export async function fetchNodeCommands(nodeId: string): Promise<NodeCommand[]> {
  const res = await fetchWithAuth(`/api/nodes/${nodeId}/commands`);
  if (!res.ok) throw new Error("Failed to fetch commands");
  return res.json();
}

// ── Metrics ──────────────────────────────────────────────────────────────────

export async function fetchNodeMetricsHistory(
  nodeId: string,
  range: MetricRange
): Promise<NodeMetricHistoryPoint[]> {
  const { days, bucket } = METRIC_RANGE_CONFIG[range];
  const to = new Date().toISOString();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const res = await fetchWithAuth(
    `/api/nodes/${nodeId}/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&bucket=${bucket}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: NodeMetricHistoryPoint[] = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Returns the SSE URL for live metrics (used directly by EventSource). */
export function liveMetricsUrl(nodeId: string): string {
  return `/api/nodes/${nodeId}/metrics/live`;
}

/** Returns the SSE URL for live node logs. */
export function liveLogsUrl(nodeId: string, unit = "", lines = 100): string {
  const params = new URLSearchParams();
  if (unit) params.set("unit", unit);
  params.set("lines", String(lines));
  return `/api/nodes/${nodeId}/logs/stream?${params.toString()}`;
}

// ── Containers ───────────────────────────────────────────────────────────────

export async function fetchContainers(nodeId: string): Promise<DockerContainer[]> {
  const { output, error } = await dispatchAndPoll(nodeId, "container.list");
  if (error) throw new Error(error);
  return JSON.parse(output || "[]");
}

export async function runContainerAction(
  nodeId: string,
  name: string,
  action: ContainerAction
): Promise<void> {
  await dispatchAndPoll(nodeId, `container.${action}.${name}`);
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export async function fetchNodeAlertConfig(nodeId: string): Promise<NodeAlertConfig | null> {
  const res = await fetchWithAuth(`/api/nodes/${nodeId}/alerts`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveNodeAlertConfig(
  nodeId: string,
  data: Omit<NodeAlertConfig, "id" | "nodeId" | "createdAt" | "updatedAt">
): Promise<NodeAlertConfig> {
  const res = await fetchWithAuth(`/api/nodes/${nodeId}/alerts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, nodeId }),
  });
  if (!res.ok) throw new Error("Failed to save alert config");
  return res.json();
}
