import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_JOB_ENDPOINTS } from "./constants";
import { JobCommandType } from "../interfaces/job";

export async function fetchNodeJobs(nodeId: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_JOB_ENDPOINTS.JOBS.BY_NODE(nodeId), { method: "GET" });
}

export async function fetchJob(jobId: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_JOB_ENDPOINTS.JOBS.DETAIL(jobId), { method: "GET" });
}

export async function fetchDispatchJob(
  nodeId: string,
  commandName: string,
  commandType: JobCommandType = "custom"
): Promise<Response> {
  return fetchWithAuth(CLIENT_API_JOB_ENDPOINTS.JOBS.BY_NODE(nodeId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commandName, commandType }),
  });
}
