export const APP_NAME = "AutoHost Cloud";
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
    UPDATE: "/v1/nodes",
    DELETE: (id: string) => `/v1/nodes/${id}`,
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
  NODE_ALERTS: {
    BY_NODE: (nodeId: string) => `/v1/node-alerts/${nodeId}`,
  },
  NODE_METRICS: {
    HISTORY: (nodeId: string) => `/v1/node-metrics/${nodeId}/history`,
  },
  SCHEDULED_TASKS: {
    LIST: "/v1/scheduled-tasks",
    DETAIL: (id: string) => `/v1/scheduled-tasks/${id}`,
    TOGGLE: (id: string) => `/v1/scheduled-tasks/${id}/toggle`,
  },
  MARKETPLACE: {
    APPS: "/v1/marketplace/apps",
    DEPLOY: "/v1/marketplace/apps/deploy",
    BY_NODE: (nodeId: string) => `/v1/marketplace/apps/node/${nodeId}`,
  },
  ALERT_EVENTS: {
    LIST: "/v1/alert-events",
  },
  PROJECTS: {
    LIST: "/v1/projects",
    CREATE: "/v1/projects",
    DETAIL: (id: string) => `/v1/projects/${id}`,
    UPDATE: (id: string) => `/v1/projects/${id}`,
    DELETE: (id: string) => `/v1/projects/${id}`,
    ASSIGN_NODE: (projectId: string, nodeId: string) => `/v1/projects/${projectId}/nodes/${nodeId}`,
    REMOVE_NODE: (projectId: string, nodeId: string) => `/v1/projects/${projectId}/nodes/${nodeId}`,
  },
  SERVICE_MONITORS: {
    LIST: "/v1/service-monitors",
    CREATE: "/v1/service-monitors",
    UPDATE: (id: string) => `/v1/service-monitors/${id}`,
    DELETE: (id: string) => `/v1/service-monitors/${id}`,
    HISTORY: (id: string) => `/v1/service-monitors/${id}/history`,
    UPTIME: (id: string) => `/v1/service-monitors/${id}/uptime`,
  },
  CADDY_ROUTES: {
    BY_NODE: (nodeId: string) => `/v1/caddy-routes/${nodeId}`,
    DELETE: (nodeId: string, domain: string) => `/v1/caddy-routes/${nodeId}/${domain}`,
  },
  PROFILE: {
    COLLECT: (nodeId: string) => `/v1/nodes/${nodeId}/profile`,
    DOWNLOAD: (nodeId: string) => `/v1/nodes/${nodeId}/profile/download`,
    PROXY: (sessionId: string) => `/v1/pprof/${sessionId}`,
  },
  REPORTS: {
    TRIGGER_NODE_STATUS: "/v1/reports/node-status/trigger",
    SETTINGS: "/v1/reports/settings",
  },
} as const;

