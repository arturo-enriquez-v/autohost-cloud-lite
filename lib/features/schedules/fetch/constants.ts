export const CLIENT_API_SCHEDULE_ENDPOINTS = {
  SCHEDULED_TASKS: {
    LIST: "/api/scheduled-tasks",
    DETAIL: (id: string) => `/api/scheduled-tasks/${id}`,
    TOGGLE: (id: string) => `/api/scheduled-tasks/${id}/toggle`,
  },
} as const;

export const API_SCHEDULE_ENDPOINTS = {
  SCHEDULED_TASKS: {
    LIST: "/v1/scheduled-tasks",
    DETAIL: (id: string) => `/v1/scheduled-tasks/${id}`,
    TOGGLE: (id: string) => `/v1/scheduled-tasks/${id}/toggle`,
  },
} as const;
