import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_SCHEDULE_ENDPOINTS } from "./constants";
import type { CreateScheduledTaskRequest } from "../interfaces/schedule";

export async function fetchScheduledTasks(): Promise<Response> {
  return fetchWithAuth(CLIENT_API_SCHEDULE_ENDPOINTS.SCHEDULED_TASKS.LIST, { method: "GET" });
}

export async function fetchCreateScheduledTask(data: CreateScheduledTaskRequest): Promise<Response> {
  return fetchWithAuth(CLIENT_API_SCHEDULE_ENDPOINTS.SCHEDULED_TASKS.LIST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function fetchDeleteScheduledTask(id: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_SCHEDULE_ENDPOINTS.SCHEDULED_TASKS.DETAIL(id), {
    method: "DELETE",
  });
}

export async function fetchToggleScheduledTask(id: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_SCHEDULE_ENDPOINTS.SCHEDULED_TASKS.TOGGLE(id), {
    method: "PATCH",
  });
}
