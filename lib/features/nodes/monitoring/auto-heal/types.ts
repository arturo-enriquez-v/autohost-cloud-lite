/** Auto-heal settings of a service monitor. The agent applies them; field names match the API. */
export interface AutoHealConfig {
  enabled: boolean;
  /** Failed checks before acting. The web client sets it to the monitor's failure threshold. */
  consecutive_failures_threshold: number;
  /** Seconds to wait after an action before acting again. */
  grace_period_seconds: number;
  restart: {
    enabled: boolean;
    /** Restarts allowed within window_seconds. */
    max_attempts: number;
    window_seconds: number;
  };
  recreate: {
    enabled: boolean;
    /** Empty: the agent reads the project from the container's Docker Compose labels. */
    compose_file_path: string;
    /** Empty: the compose service from the container's labels. */
    service_name: string;
    /** Recreations per incident. */
    max_attempts: number;
  };
}

export type ServiceStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "RESTARTING"
  | "RECREATING"
  | "CRITICAL_FAILED"
  | "COOLING_DOWN";

/** Auto-heal state reported by the agent (read-only). Timestamps are UNIX seconds. */
export interface ServiceHealthState {
  status: ServiceStatus;
  consecutive_failures: number;
  restart_timestamps: number[];
  recreate_attempts: number;
  last_action_timestamp: number | null;
  failure_started_at?: number | null;
  recovered_at?: number | null;
}
