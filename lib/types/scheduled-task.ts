export type ScheduleType = "interval" | "daily"

export interface ScheduledTask {
  id: string
  nodeId: string
  commandId: string
  commandName: string
  scheduleType: ScheduleType
  intervalSeconds: number | null
  runAtTime: string | null // "HH:MM" UTC
  enabled: boolean
  lastRunAt: string | null
  nextRunAt: string
  lastJobId: string | null
  lastJobStatus: string | null
  lastJobOutput: string | null
  lastJobError: string | null
  lastJobFinishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ScheduledTaskBackendResponse {
  id: string
  node_id: string
  command_id: string
  command_name: string
  schedule_type: ScheduleType
  interval_seconds: number | null
  run_at_time: string | null
  enabled: boolean
  last_run_at: string | null
  next_run_at: string
  last_job_id: string | null
  last_job_status: string | null
  last_job_output: string | null
  last_job_error: string | null
  last_job_finished_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateScheduledTaskRequest {
  nodeId: string
  commandId: string
  commandName: string
  scheduleType: ScheduleType
  intervalSeconds?: number
  runAtTime?: string
  enabled?: boolean
}
