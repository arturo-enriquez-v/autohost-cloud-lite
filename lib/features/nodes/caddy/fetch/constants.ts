export const CLIENT_API_CADDY_ENDPOINTS = {
  CADDY_ROUTES: {
    BY_NODE: (nodeId: string) => `/api/nodes/${nodeId}/caddy-routes`,
    DELETE: (nodeId: string, domain: string) =>
      `/api/nodes/${nodeId}/caddy-routes/${encodeURIComponent(domain)}`,
  },
} as const;

export const API_CADDY_ENDPOINTS = {
  CADDY_ROUTES: {
    BY_NODE: (nodeId: string) => `/v1/caddy-routes/${nodeId}`,
    DELETE: (nodeId: string, domain: string) => `/v1/caddy-routes/${nodeId}/${domain}`,
  },
} as const;
