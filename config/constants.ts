export const APP_NAME = "AutoHost Cloud Lite";
export const APP_DESCRIPTION = "Secure Server Management";

// Cookie names
export const COOKIES = {
  ACCESS_TOKEN: "access_token",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/v1/auth/login",
    REGISTER: "/v1/auth/register",
    LOGOUT: "/v1/auth/logout",
    ME: "/v1/auth/me",
    REFRESH: "/v1/auth/refresh",
  },
  NODES: {
    LIST: "/v1/nodes",
    WITH_METRICS: "/v1/nodes/with-metrics",
    DETAIL: (id: string) => `/v1/nodes/${id}`,
  },
  ENROLLMENTS: {
    CREATE: "/v1/enrollments/generate",
  },
  NODE_COMMANDS: {
    BY_NODE: (nodeId: string) => `/v1/node-commands/node/${nodeId}`,
  },
  JOBS: {
    CREATE: "/v1/jobs",
    DETAIL: (id: string) => `/v1/jobs/${id}`,
    BY_NODE: (nodeId: string) => `/v1/jobs/node/${nodeId}`,
  },

} as const;

