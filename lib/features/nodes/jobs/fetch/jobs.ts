import { API_JOB_ENDPOINTS } from "./constants";
import { backendFetch } from "@/lib/api";
import type { JobBackendResponse, Job, JobCommandType } from "@/lib/types";

export async function dispatchJobBackend(
  nodeId: string,
  commandName: string,
  commandType: JobCommandType,
  accessToken: string
) {
  return backendFetch(
    API_JOB_ENDPOINTS.JOBS.CREATE,
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
  return backendFetch(API_JOB_ENDPOINTS.JOBS.DETAIL(jobId), { method: "GET" }, accessToken);
}

export async function getJobsByNodeBackend(nodeId: string, accessToken: string) {
  return backendFetch(API_JOB_ENDPOINTS.JOBS.BY_NODE(nodeId), { method: "GET" }, accessToken);
}

// TODO: drop the PascalCase fallbacks once every deployed API serializes jobs in snake_case.
interface LegacyJob {
  ID?: string;
  NodeID?: string;
  CommandName?: string;
  CommandType?: JobCommandType;
  Status?: Job["status"];
  Output?: string;
  Error?: string;
  CreatedAt?: string;
  StartedAt?: string | null;
  FinishedAt?: string | null;
}

export function mapJobFromBackend(j: JobBackendResponse): Job {
  const legacy = j as unknown as LegacyJob;
  return {
    id: j.id ?? legacy.ID,
    nodeId: j.node_id ?? legacy.NodeID,
    commandName: j.command_name ?? legacy.CommandName,
    commandType: j.command_type ?? legacy.CommandType,
    status: j.status ?? legacy.Status,
    output: j.output ?? legacy.Output,
    error: j.error ?? legacy.Error,
    createdAt: j.created_at ?? legacy.CreatedAt,
    startedAt: j.started_at ?? legacy.StartedAt ?? null,
    finishedAt: j.finished_at ?? legacy.FinishedAt ?? null,
  };
}
