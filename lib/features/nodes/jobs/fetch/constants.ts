export const CLIENT_API_JOB_ENDPOINTS = {
  JOBS: {
    DETAIL: (id: string) => `/api/jobs/${id}`,
    BY_NODE: (nodeId: string) => `/api/nodes/${nodeId}/jobs`,
  },
} as const;

export const API_JOB_ENDPOINTS = {
  JOBS: {
    CREATE: "/v1/jobs",
    DETAIL: (id: string) => `/v1/jobs/${id}`,
    BY_NODE: (nodeId: string) => `/v1/jobs/node/${nodeId}`,
  },
} as const;
