export const CLIENT_API_PROJECT_ENDPOINTS = {
  PROJECTS: {
    LIST: "/api/projects",
    CREATE: "/api/projects",
    DETAIL: (id: string) => `/api/projects/${id}`,
    UPDATE: (id: string) => `/api/projects/${id}`,
    DELETE: (id: string) => `/api/projects/${id}`,
    ASSIGN_NODE: (projectId: string, nodeId: string) => `/api/projects/${projectId}/nodes/${nodeId}`,
    REMOVE_NODE: (projectId: string, nodeId: string) => `/api/projects/${projectId}/nodes/${nodeId}`,
  },
} as const;

export const API_PROJECT_ENDPOINTS = {
  PROJECTS: {
    LIST: "/v1/projects",
    CREATE: "/v1/projects",
    DETAIL: (id: string) => `/v1/projects/${id}`,
    UPDATE: (id: string) => `/v1/projects/${id}`,
    DELETE: (id: string) => `/v1/projects/${id}`,
    ASSIGN_NODE: (projectId: string, nodeId: string) => `/v1/projects/${projectId}/nodes/${nodeId}`,
    REMOVE_NODE: (projectId: string, nodeId: string) => `/v1/projects/${projectId}/nodes/${nodeId}`,
  },
} as const;
