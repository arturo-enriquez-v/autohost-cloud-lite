const API_ENDPOINTS = {
 MARKETPLACE: {
    APPS: "/v1/marketplace/apps",
    DEPLOY: "/v1/marketplace/apps/deploy",
    BY_NODE: (nodeId: string) => `/v1/marketplace/apps/node/${nodeId}`,
  }
};