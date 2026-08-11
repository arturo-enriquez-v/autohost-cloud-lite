export interface AutoHealConfig {
  enabled: boolean;
  consecutive_failures_threshold: number; // Ej: 3 fallos seguidos antes de actuar
  grace_period_seconds: number;           // Ej: 30s de espera tras una acción antes de evaluar de nuevo
  restart: {
    enabled: boolean;
    max_attempts: number;          // Ej: 3 intentos
    window_seconds: number;        // Ej: Dentro de una ventana de 900s (15 min)
  };
  recreate: {
    enabled: boolean;
    compose_file_path: string;     // Ruta al docker-compose.yml
    service_name: string;          // Nombre del servicio en el YAML
    max_attempts: number;          // Recomendado: 1 por incidente
  };
}

export type ServiceStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'RESTARTING'
  | 'RECREATING'
  | 'CRITICAL_FAILED'
  | 'COOLING_DOWN';

export interface ServiceHealthState {
  status: ServiceStatus;
  consecutiveFailures: number;
  restartTimestamps: number[];      // Timestamps UNIX en segundos para la ventana
  recreateAttempts: number;         // Intentos de recreación en el incidente actual
  lastActionTimestamp: number | null; // UNIX timestamp en segundos de la última acción
}

export interface CommandExecutionResult {
  stdout: string;
  stderr: string;
}

export interface CommandExecutor {
  exec(command: string): Promise<CommandExecutionResult>;
}

export interface AutoHealCallbacks {
  onStatusChange?: (
    serviceName: string,
    previousStatus: ServiceStatus,
    newStatus: ServiceStatus
  ) => void;
  onCriticalFailure?: (
    serviceName: string,
    state: ServiceHealthState,
    error?: string
  ) => void;
  onLog?: (message: string, level: 'info' | 'warn' | 'error') => void;
}
