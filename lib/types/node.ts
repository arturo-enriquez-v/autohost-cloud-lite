export type NodeStatus = "online" | "offline";

export type ContainerStatus = "running" | "stopped";

export interface Container {
  name: string;
  status: ContainerStatus;
}

export interface Node {
  id: string;
  name: string;
  status: NodeStatus;
  cpu: number;
  ram: number;
  disk: number;
  containers: Container[];
  ipLocal?: string;
  os?: string;
  arch?: string;
  versionAgent?: string;
  lastSeenAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tipo de respuesta del backend (formato original - PascalCase)
export interface NodeBackendResponse {
  ID: string;
  Hostname: string;
  IPLocal: string;
  OS: string;
  Arch: string;
  VersionAgent: string;
  OwnerID: string;
  LastSeenAt: string;
  CreatedAt: string;
  UpdatedAt: string;
}

// Tipo de métrica del backend
export interface NodeMetric {
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
  collected_at: string;
}

// Punto de historial de métricas (agregado por bucket temporal)
export interface NodeMetricHistoryPoint {
  bucket: string;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
}

// Tipo de respuesta del backend con métricas (formato snake_case)
export interface NodeWithMetricsBackendResponse {
  id: string;
  hostname: string;
  ip_local: string;
  os: string;
  arch: string;
  version_agent: string;
  owner_id: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  last_metric?: NodeMetric;
}
