// Respuesta del endpoint GET /nodes/:id  (PascalCase — legado del backend Go)
export interface NodeBackendDto {
  ID: string;
  Hostname: string;
  IPLocal: string;
  IPVPN?: string;
  OS: string;
  Arch: string;
  VersionAgent: string;
  OwnerID: string;
  LastSeenAt: string;
  CreatedAt: string;
  UpdatedAt: string;
}

// Respuesta del endpoint GET /nodes/with-metrics (snake_case)
export interface NodeWithMetricsBackendDto {
  id: string;
  hostname: string;
  ip_local: string;
  ip_vpn?: string;
  os: string;
  arch: string;
  version_agent: string;
  owner_id: string;
  project_id?: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  last_metric?: NodeMetricBackendDto;
}

export interface NodeMetricBackendDto {
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
  collected_at: string;
}
