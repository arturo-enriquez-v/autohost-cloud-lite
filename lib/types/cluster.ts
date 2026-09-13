export interface Cluster {
  id: string;
  user_id: string;
  name: string;
  status: string;
  overlay_network: string;
  created_at: string;
  updated_at: string;
}

export interface ClusterNode {
  id: string;
  cluster_id: string;
  node_id: string;
  role: "manager" | "worker";
  swarm_node_id: string;
  status: string;
  joined_at: string;
  node_hostname?: string;
  node_ip?: string;
  node_ip_vpn?: string;
}

export interface AutoscalePolicy {
  id?: string;
  cluster_service_id?: string;
  enabled: boolean;
  metric_type: "cpu" | "ram";
  scale_up_threshold: number;
  scale_down_threshold: number;
  scale_up_duration_sec: number;
  scale_down_duration_sec: number;
  min_replicas: number;
  max_replicas: number;
  cooldown_seconds: number;
  last_scaled_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClusterService {
  id: string;
  cluster_id: string;
  name: string;
  image: string;
  ports: string;
  env_vars: Record<string, string>;
  replicas: number;
  swarm_service_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  autoscaling?: AutoscalePolicy;
}

export interface ClusterWithDetails {
  cluster: Cluster;
  nodes: ClusterNode[];
  services: ClusterService[];
}
