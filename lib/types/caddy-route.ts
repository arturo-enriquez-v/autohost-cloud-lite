export interface CaddyRoute {
  id: string;
  nodeId: string;
  userId: string;
  domain: string;
  upstream: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaddyRouteBackendResponse {
  id: string;
  node_id: string;
  user_id: string;
  domain: string;
  upstream: string;
  created_at: string;
  updated_at: string;
}
