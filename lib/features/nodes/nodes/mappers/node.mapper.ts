import { calculateNodeStatus } from "@/lib/utils/node-status";
import type { NodeBackendDto, NodeWithMetricsBackendDto } from "../interfaces/NodeBackendDto";
import type { NodeMapper } from "../interfaces/NodeMapper";

export const mapNodeFromBackend: NodeMapper<NodeBackendDto> = (dto) => ({
  id: dto.ID,
  name: dto.Hostname,
  hostname: dto.Hostname,
  status: calculateNodeStatus(dto.LastSeenAt),
  cpu: 0,
  ram: 0,
  disk: 0,
  containers: [],
  ipLocal: dto.IPLocal,
  os: dto.OS,
  arch: dto.Arch,
  versionAgent: dto.VersionAgent,
  lastSeenAt: dto.LastSeenAt,
  createdAt: dto.CreatedAt,
  updatedAt: dto.UpdatedAt,
});

export const mapNodeWithMetricsFromBackend: NodeMapper<NodeWithMetricsBackendDto> = (dto) => ({
  id: dto.id,
  name: dto.hostname,
  hostname: dto.hostname,
  status: calculateNodeStatus(dto.last_seen_at),
  cpu: dto.last_metric?.cpu_usage_percent ?? 0,
  ram: dto.last_metric?.memory_usage_percent ?? 0,
  disk: dto.last_metric?.disk_usage_percent ?? 0,
  containers: [],
  ipLocal: dto.ip_local,
  os: dto.os,
  arch: dto.arch,
  versionAgent: dto.version_agent,
  projectId: dto.project_id,
  lastSeenAt: dto.last_seen_at,
  createdAt: dto.created_at,
  updatedAt: dto.updated_at,
});
