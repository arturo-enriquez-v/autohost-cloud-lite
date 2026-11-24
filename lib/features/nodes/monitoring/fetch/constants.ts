export const CLIENT_API_MONITOR_ENDPOINTS = {
  SERVICE_MONITORS: {
    BY_NODE: (nodeId: string) => `/api/nodes/${nodeId}/service-monitors`,
    DETAIL: (nodeId: string, monitorId: string) =>
      `/api/nodes/${nodeId}/service-monitors/${monitorId}`,
    UPTIME: (nodeId: string, monitorId: string) =>
      `/api/nodes/${nodeId}/service-monitors/${monitorId}/uptime`,
    HISTORY: (nodeId: string, monitorId: string) =>
      `/api/nodes/${nodeId}/service-monitors/${monitorId}/history`,
    CHECK: (nodeId: string, monitorId: string) =>
      `/api/nodes/${nodeId}/service-monitors/${monitorId}/check`,
    STATS: (nodeId: string, monitorId: string) =>
      `/api/nodes/${nodeId}/service-monitors/${monitorId}/stats`,
    INCIDENTS: (nodeId: string, monitorId: string) =>
      `/api/nodes/${nodeId}/service-monitors/${monitorId}/incidents`,
  },
} as const;

export const API_MONITOR_ENDPOINTS = {
  SERVICE_MONITORS: {
    LIST: "/v1/service-monitors",
    CREATE: "/v1/service-monitors",
    UPDATE: (id: string) => `/v1/service-monitors/${id}`,
    DELETE: (id: string) => `/v1/service-monitors/${id}`,
    UPTIME: (id: string) => `/v1/service-monitors/${id}/uptime`,
    HISTORY: (id: string) => `/v1/service-monitors/${id}/history`,
    CHECK: (id: string) => `/v1/service-monitors/${id}/check`,
    STATS: (id: string) => `/v1/service-monitors/${id}/stats`,
    INCIDENTS: (id: string) => `/v1/service-monitors/${id}/incidents`,
  },
} as const;
