import { API_ENDPOINTS } from "@/config/constants";
import { backendFetch } from "../api";
import type { JobBackendResponse, Job, JobCommandType } from "@/lib/types";

export async function dispatchJobBackend(
  nodeId: string,
  commandName: string,
  commandType: JobCommandType,
  accessToken: string
) {
  return backendFetch(
    API_ENDPOINTS.JOBS.CREATE,
    {
      method: "POST",
      body: JSON.stringify({
        node_id: nodeId,
        command_name: commandName,
        command_type: commandType,
      }),
    },
    accessToken
  );
}

export async function getJobBackend(jobId: string, accessToken: string) {
  return backendFetch(API_ENDPOINTS.JOBS.DETAIL(jobId), { method: "GET" }, accessToken);
}

export async function getJobsByNodeBackend(nodeId: string, accessToken: string) {
  return backendFetch(API_ENDPOINTS.JOBS.BY_NODE(nodeId), { method: "GET" }, accessToken);
}

export function mapJobFromBackend(j: JobBackendResponse): Job {
  return {
    id: j.ID,
    nodeId: j.NodeID,
    commandName: j.CommandName,
    commandType: j.CommandType,
    status: j.Status,
    output: j.Output,
    error: j.Error,
    createdAt: j.CreatedAt,
    startedAt: j.StartedAt,
    finishedAt: j.FinishedAt,
  };
}
