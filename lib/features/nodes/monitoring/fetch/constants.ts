export const CLIENT_API_MONITOR_ENDPOINTS = {
  SERVICE_MONITORS: {
    BY_NODE: (nodeId: string) => `/api/nodes/${nodeId}/service-monitors`,
    DETAIL: (nodeId: string, monitorId: string) =>
      `/api/nodes/${nodeId}/service-monitors/${monitorId}`,
    UPTIME: (nodeId: string, monitorId: string) =>
      `/api/nodes/${nodeId}/service-monitors/${monitorId}/uptime`,
  },
} as const;

export const API_MONITOR_ENDPOINTS = {
  SERVICE_MONITORS: {
    LIST: "/v1/service-monitors",
    CREATE: "/v1/service-monitors",
    UPDATE: (id: string) => `/v1/service-monitors/${id}`,
    DELETE: (id: string) => `/v1/service-monitors/${id}`,
    UPTIME: (id: string) => `/v1/service-monitors/${id}/uptime`,
  },
} as const;
