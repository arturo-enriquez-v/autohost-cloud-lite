const API_NODES_ENDPOINTS = {
 MARKETPLACE: {
    APPS: "/v1/marketplace/apps",
    DEPLOY: "/v1/marketplace/apps/deploy",
    BY_NODE: (nodeId: string) => `/v1/marketplace/apps/node/${nodeId}`,
  }
};

export const CLIENT_API_MARKETPLACE_ENDPOINTS = {
  MARKETPLACE: {
    APPS: "/api/marketplace/apps",
    DEPLOY: "/api/marketplace/apps/deploy",
    BY_NODE: (nodeId: string) => `/api/marketplace/apps/node/${nodeId}`,
  }
};