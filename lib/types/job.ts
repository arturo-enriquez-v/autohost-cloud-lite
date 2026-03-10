export type JobStatus = "pending" | "running" | "completed" | "failed";
export type JobCommandType = "default" | "custom";

// Backend response (Go PascalCase JSON — no json tags on struct)
export interface JobBackendResponse {
  ID: string;
  NodeID: string;
  CommandName: string;
  CommandType: JobCommandType;
  Status: JobStatus;
  Output: string;
  Error: string;
  CreatedAt: string;
  StartedAt: string | null;
  FinishedAt: string | null;
}

// Frontend model
export interface Job {
  id: string;
  nodeId: string;
  commandName: string;
  commandType: JobCommandType;
  status: JobStatus;
  output: string;
  error: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
