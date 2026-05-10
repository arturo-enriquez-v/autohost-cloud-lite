import { API_SCHEDULE_ENDPOINTS } from "./constants";
import type {
  ScheduledTask,
  ScheduledTaskBackendResponse,
  CreateScheduledTaskRequest,
} from "../interfaces/schedule";
import { backendFetch } from "@/lib/api";

export async function listScheduledTasksBackend(accessToken: string) {
  return backendFetch(API_SCHEDULE_ENDPOINTS.SCHEDULED_TASKS.LIST, { method: "GET" }, accessToken);
}

export async function createScheduledTaskBackend(
  data: CreateScheduledTaskRequest,
  accessToken: string
) {
  return backendFetch(
    API_SCHEDULE_ENDPOINTS.SCHEDULED_TASKS.LIST,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        node_id: data.nodeId,
        command_id: data.commandId,
        command_name: data.commandName,
        schedule_type: data.scheduleType,
        interval_seconds: data.intervalSeconds,
        run_at_time: data.runAtTime,
        enabled: data.enabled ?? true,
      }),
    },
    accessToken
  );
}

export async function updateScheduledTaskBackend(
  id: string,
  data: Pick<ScheduledTask, "commandId" | "commandName" | "scheduleType" | "intervalSeconds" | "runAtTime" | "enabled">,
  accessToken: string
) {
  return backendFetch(
    API_SCHEDULE_ENDPOINTS.SCHEDULED_TASKS.DETAIL(id),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command_id: data.commandId,
        command_name: data.commandName,
        schedule_type: data.scheduleType,
        interval_seconds: data.intervalSeconds,
        run_at_time: data.runAtTime,
        enabled: data.enabled,
      }),
    },
    accessToken
  );
}

export async function deleteScheduledTaskBackend(id: string, accessToken: string) {
  return backendFetch(
    API_SCHEDULE_ENDPOINTS.SCHEDULED_TASKS.DETAIL(id),
    { method: "DELETE" },
    accessToken
  );
}

export async function toggleScheduledTaskBackend(id: string, accessToken: string) {
  return backendFetch(
    API_SCHEDULE_ENDPOINTS.SCHEDULED_TASKS.TOGGLE(id),
    { method: "PATCH" },
    accessToken
  );
}

export function mapScheduledTaskFromBackend(r: ScheduledTaskBackendResponse): ScheduledTask {
  return {
    id: r.id,
    nodeId: r.node_id,
    commandId: r.command_id,
    commandName: r.command_name,
    scheduleType: r.schedule_type,
    intervalSeconds: r.interval_seconds,
    runAtTime: r.run_at_time,
    enabled: r.enabled,
    lastRunAt: r.last_run_at,
    nextRunAt: r.next_run_at,
    lastJobId: r.last_job_id,
    lastJobStatus: r.last_job_status,
    lastJobOutput: r.last_job_output,
    lastJobError: r.last_job_error,
    lastJobFinishedAt: r.last_job_finished_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
