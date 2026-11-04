import { API_ENDPOINTS } from "@/config/constants";
import type { NodeBackendResponse } from "@/lib/types";
import { backendFetch } from "@/lib/api";
import { calculateNodeStatus } from "../../../../utils/node-status";
import { API_NODES_ENDPOINTS } from "./constants";


export async function getNodesBackend(accessToken: string) {
  return backendFetch(API_NODES_ENDPOINTS.NODES.LIST, {
    method: "GET",
  }, accessToken);
}


export async function getNodesWithMetricsBackend(accessToken: string) {
  return backendFetch(API_NODES_ENDPOINTS.NODES.WITH_METRICS, {
    method: "GET",
  }, accessToken);
} 
 

export async function getNodeBackend(id: string, accessToken: string) {
  return backendFetch(API_NODES_ENDPOINTS.NODES.DETAIL(id), {
    method: "GET",
  }, accessToken);
}

export async function updateNodeBackend(id: string, hostname: string, accessToken: string) {
  return backendFetch(API_NODES_ENDPOINTS.NODES.UPDATE, {
    method: "PUT",
    body: JSON.stringify({ id, hostname }),
  }, accessToken);
}

export async function deleteNodeBackend(id: string, accessToken: string) {
  return backendFetch(API_NODES_ENDPOINTS.NODES.DELETE(id), {
    method: "DELETE",
  }, accessToken);
}



/**
 * Obtiene el historial de métricas de un nodo
 */
export async function getNodeMetricsHistoryBackend(
  nodeId: string,
  accessToken: string,
  params: { from?: string; to?: string; bucket?: string } = {}
) {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.bucket) query.set("bucket", params.bucket);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return backendFetch(`${API_NODES_ENDPOINTS.NODE_METRICS.HISTORY(nodeId)}${qs}`, { method: "GET" }, accessToken);
}

/**
 * Obtiene el historial de métricas de un contenedor específico
 */
export async function getContainerMetricsHistoryBackend(
  nodeId: string,
  accessToken: string,
  params: { container_name?: string; container_id?: string; from?: string; to?: string; bucket?: string } = {}
) {
  const query = new URLSearchParams();
  if (params.container_name) query.set("container_name", params.container_name);
  if (params.container_id) query.set("container_id", params.container_id);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.bucket) query.set("bucket", params.bucket);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return backendFetch(`/v1/node-containers/${nodeId}/metrics${qs}`, { method: "GET" }, accessToken);
}

/**
 * Mapea un nodo del backend al formato de la UI
 */
export function mapNodeFromBackend(node: any) {
  const id = node?.id || node?.ID || "";
  const hostname = node?.hostname || node?.Hostname || node?.name || "Node";
  const lastSeen = node?.last_seen_at || node?.LastSeenAt;
  const isLocal = Boolean(node?.is_local ?? node?.IsLocal);
  const ipLocal = node?.ip_local || node?.IPLocal;
  const ipVpn = node?.ip_vpn || node?.ipVpn || node?.IPVPN;
  const os = node?.os || node?.OS;
  const arch = node?.arch || node?.Arch;
  const versionAgent = node?.version_agent || node?.VersionAgent;

  return {
    id,
    name: hostname,
    hostname,
    status: calculateNodeStatus(lastSeen),
    cpu: 0,
    ram: 0,
    disk: 0,
    isLocal,
    containers: [],
    ipLocal,
    ipVpn,
    os,
    arch,
    versionAgent,
    lastSeenAt: lastSeen,
    createdAt: node?.created_at || node?.CreatedAt,
    updatedAt: node?.updated_at || node?.UpdatedAt,
  };
}

/**
 * Mapea un nodo con métricas del backend (snake_case) al formato de la UI
 */
export function mapNodeWithMetricsFromBackend(node: import("@/lib/types").NodeWithMetricsBackendResponse) {
  return {
    id: node.id,
    name: node.hostname,
    hostname: node.hostname,
    status: calculateNodeStatus(node.last_seen_at),
    cpu: node.last_metric?.cpu_usage_percent || 0,
    ram: node.last_metric?.memory_usage_percent || 0,
    disk: node.last_metric?.disk_usage_percent || 0,
    cpuTempCelsius: node.last_metric?.cpu_temp_celsius || undefined,
    isLocal: Boolean(node.is_local),
    containers: [],
    ipLocal: node.ip_local,
    ipVpn: node.ip_vpn,
    os: node.os,
    arch: node.arch,
    versionAgent: node.version_agent,
    projectId: node.project_id,
    lastSeenAt: node.last_seen_at,
    createdAt: node.created_at,
    updatedAt: node.updated_at,
  };
}
