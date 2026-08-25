import type {
  AutoHealConfig,
  ServiceHealthState,
  ServiceStatus,
  CommandExecutor,
  AutoHealCallbacks,
} from "./types";

/**
 * Creates a default initial state for a service health monitor.
 */
export function createInitialState(status: ServiceStatus = 'HEALTHY'): ServiceHealthState {
  return {
    status,
    consecutiveFailures: 0,
    restartTimestamps: [],
    recreateAttempts: 0,
    lastActionTimestamp: null,
  };
}

/**
 * Default mock or node command executor fallback.
 */
const defaultExecutor: CommandExecutor = {
  async exec(command: string) {
    console.log(`[AutoHeal Exec] ${command}`);
    return { stdout: "", stderr: "" };
  },
};

/**
 * Core Auto-Healing State Machine Algorithm.
 * Evaluates a service health check result and triggers multi-stage recovery actions.
 */
export async function handleServiceCheck(
  serviceConfig: AutoHealConfig,
  state: ServiceHealthState,
  isHealthy: boolean,
  containerIdOrName?: string,
  executor: CommandExecutor = defaultExecutor,
  callbacks?: AutoHealCallbacks
): Promise<void> {
  const serviceName = serviceConfig.recreate?.service_name || containerIdOrName || "unnamed-service";
  const containerId = containerIdOrName || serviceConfig.recreate?.service_name || "container";
  const now = Math.floor(Date.now() / 1000);
  const previousStatus = state.status;

  const log = (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
    const formatted = `[AutoHeal] Service ${serviceName}: ${msg}`;
    if (callbacks?.onLog) {
      callbacks.onLog(formatted, level);
    } else {
      if (level === 'error') console.error(formatted);
      else if (level === 'warn') console.warn(formatted);
      else console.log(formatted);
    }
  };

  const updateStatus = (newStatus: ServiceStatus) => {
    if (state.status !== newStatus) {
      const old = state.status;
      state.status = newStatus;
      callbacks?.onStatusChange?.(serviceName, old, newStatus);
    }
  };

  // If AutoHeal is globally disabled for this service
  if (!serviceConfig.enabled) {
    if (isHealthy) {
      state.consecutiveFailures = 0;
      updateStatus('HEALTHY');
    } else {
      state.consecutiveFailures++;
      updateStatus('DEGRADED');
    }
    return;
  }

  // -------------------------------------------------------------
  // RULE 1: Service is HEALTHY
  // -------------------------------------------------------------
  if (isHealthy) {
    state.consecutiveFailures = 0;
    if (state.status !== 'COOLING_DOWN') {
      state.restartTimestamps = [];
      state.recreateAttempts = 0;
    }
    updateStatus('HEALTHY');
    log(`Healthcheck PASSED. Status: HEALTHY`, 'info');
    return;
  }

  // -------------------------------------------------------------
  // RULE 2: Service is UNHEALTHY
  // -------------------------------------------------------------

  // 2a. Validate Grace Period (COOLING_DOWN)
  if (state.lastActionTimestamp !== null) {
    const elapsedSinceAction = now - state.lastActionTimestamp;
    if (elapsedSinceAction < serviceConfig.grace_period_seconds) {
      updateStatus('COOLING_DOWN');
      log(
        `Healthcheck FAILED, but is within grace period (${elapsedSinceAction}s / ${serviceConfig.grace_period_seconds}s). Action: SKIPPED (COOLING_DOWN)`,
        'warn'
      );
      return;
    }
  }

  // 2b. Increment consecutive failures
  state.consecutiveFailures++;

  // 2c. Check if under consecutive failure threshold
  if (state.consecutiveFailures < serviceConfig.consecutive_failures_threshold) {
    updateStatus('DEGRADED');
    log(
      `Healthcheck FAILED (Consecutive: ${state.consecutiveFailures}/${serviceConfig.consecutive_failures_threshold}). Status: DEGRADED`,
      'warn'
    );
    return;
  }

  // -------------------------------------------------------------
  // RULE 3: RESTART Strategy (docker restart)
  // -------------------------------------------------------------
  const windowSeconds = serviceConfig.restart?.window_seconds || 900;
  const windowCutoff = now - windowSeconds;

  // Filter restartTimestamps keeping only those within window_seconds
  state.restartTimestamps = state.restartTimestamps.filter((ts) => ts > windowCutoff);

  const restartMax = serviceConfig.restart?.max_attempts ?? 0;
  const restartEnabled = serviceConfig.restart?.enabled ?? false;

  if (restartEnabled && state.restartTimestamps.length < restartMax) {
    const attemptNum = state.restartTimestamps.length + 1;
    updateStatus('RESTARTING');
    log(`Healthcheck FAILED. Action: RESTART (Attempt ${attemptNum}/${restartMax})`, 'warn');

    try {
      const cmd = `docker restart ${containerId}`;
      await executor.exec(cmd);
      state.restartTimestamps.push(now);
      state.lastActionTimestamp = now;
      updateStatus('COOLING_DOWN');
      log(`Container restart executed successfully. Entered COOLING_DOWN for ${serviceConfig.grace_period_seconds}s`, 'info');
      return;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log(`docker restart failed: ${errMsg}`, 'error');
      // Record timestamp anyway to prevent fast retries on error
      state.restartTimestamps.push(now);
      state.lastActionTimestamp = now;
      updateStatus('COOLING_DOWN');
      return;
    }
  }

  // -------------------------------------------------------------
  // RULE 4: RECREATION Strategy (docker compose up -d --force-recreate)
  // -------------------------------------------------------------
  const recreateEnabled = serviceConfig.recreate?.enabled ?? false;
  const recreateMax = serviceConfig.recreate?.max_attempts ?? 0;

  if (recreateEnabled && state.recreateAttempts < recreateMax) {
    const attemptNum = state.recreateAttempts + 1;
    updateStatus('RECREATING');
    log(`Healthcheck FAILED. Action: RECREATE Compose Service (Attempt ${attemptNum}/${recreateMax})`, 'warn');

    try {
      const composeFile = serviceConfig.recreate?.compose_file_path || "";
      const targetService = serviceConfig.recreate?.service_name || serviceName;
      const cmd = `docker compose -f ${composeFile} up -d --force-recreate ${targetService}`;

      await executor.exec(cmd);
      state.recreateAttempts++;
      state.lastActionTimestamp = now;
      updateStatus('COOLING_DOWN');
      log(`Docker compose recreate executed successfully. Entered COOLING_DOWN for ${serviceConfig.grace_period_seconds}s`, 'info');
      return;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log(`docker compose recreate failed: ${errMsg}`, 'error');
      state.recreateAttempts++;
      state.lastActionTimestamp = now;
      updateStatus('COOLING_DOWN');
      return;
    }
  }

  // -------------------------------------------------------------
  // CRITICAL FAILURE: All recovery options exhausted
  // -------------------------------------------------------------
  updateStatus('CRITICAL_FAILED');
  const failureReason = `All recovery strategies exhausted (Restarts: ${state.restartTimestamps.length}/${restartMax}, Recreates: ${state.recreateAttempts}/${recreateMax})`;
  log(`Healthcheck FAILED. Status: CRITICAL_FAILED. ${failureReason}`, 'error');

  callbacks?.onCriticalFailure?.(serviceName, state, failureReason);
}
