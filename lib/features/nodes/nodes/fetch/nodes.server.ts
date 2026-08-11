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
 * Mapea un nodo del backend al formato de la UI
 */
export function mapNodeFromBackend(node: NodeBackendResponse) {
  return {
    id: node.ID,
    name: node.Hostname,
    hostname: node.Hostname,
    status: calculateNodeStatus(node.LastSeenAt),
    cpu: 0,
    ram: 0,
    disk: 0,
    containers: [],
    ipLocal: node.IPLocal,
    ipVpn: node.IPVPN,
    os: node.OS,
    arch: node.Arch,
    versionAgent: node.VersionAgent,
    lastSeenAt: node.LastSeenAt,
    createdAt: node.CreatedAt,
    updatedAt: node.UpdatedAt,
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
