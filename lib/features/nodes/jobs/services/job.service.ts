import { fetchNodeJobs, fetchJob, fetchDispatchJob } from "../fetch/jobs.client";
import type { Job, JobCommandType } from "../interfaces/job";

export const JobService = {
  async getJobsByNode(nodeId: string): Promise<Job[]> {
    const res = await fetchNodeJobs(nodeId);
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
  },

  async getJob(jobId: string): Promise<Job> {
    const res = await fetchJob(jobId);
    if (!res.ok) throw new Error(`Failed to fetch job ${jobId}`);
    return res.json();
  },

  async dispatchJob(
    nodeId: string,
    commandName: string,
    commandType: JobCommandType = "custom"
  ): Promise<Job> {
    const res = await fetchDispatchJob(nodeId, commandName, commandType);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Failed to dispatch job");
    }
    return res.json();
  },
};
