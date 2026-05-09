// API endpoints
export const API_NODES_ENDPOINTS = {
  NODES: {
    LIST: "/v1/nodes",
    WITH_METRICS: "/v1/nodes/with-metrics",
    DETAIL: (id: string) => `/v1/nodes/${id}`,
    UPDATE: "/v1/nodes",
    DELETE: (id: string) => `/v1/nodes/${id}`,
  },
  NODE_METRICS: {
    HISTORY: (nodeId: string) => `/v1/nodes/${nodeId}/metrics/history`,
  },
    
} as const;

// API endpoints
export const CLIENT_API_NODES_ENDPOINTS = {
  NODES: {
    LIST: "/api/nodes",
    WITH_METRICS: "/api/nodes/with-metrics",
    DETAIL: (id: string) => `/api/nodes/${id}`,
    UPDATE: "/api/nodes",
    DELETE: (id: string) => `/api/nodes/${id}`,
  },
    
} as const;
