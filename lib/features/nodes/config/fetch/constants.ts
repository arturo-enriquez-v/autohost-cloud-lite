export const CLIENT_API_ALERT_ENDPOINTS = {
  NODE_ALERTS: {
    BY_NODE: (nodeId: string) => `/api/nodes/${nodeId}/alerts`,
  },
} as const;

export const API_ALERT_ENDPOINTS = {
  NODE_ALERTS: {
    BY_NODE: (nodeId: string) => `/v1/node-alerts/${nodeId}`,
  },
} as const;
