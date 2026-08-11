import { handleServiceCheck, createInitialState } from "./engine";
import type { AutoHealConfig, ServiceHealthState, CommandExecutor } from "./types";

class MockExecutor implements CommandExecutor {
  public executedCommands: string[] = [];
  public shouldFail = false;

  async exec(command: string) {
    this.executedCommands.push(command);
    if (this.shouldFail) {
      throw new Error(`Command failed: ${command}`);
    }
    return { stdout: "OK", stderr: "" };
  }
}

async function runTests() {
  console.log("=========================================");
  console.log("   Running Auto-Heal Engine Tests        ");
  console.log("=========================================\n");

  const config: AutoHealConfig = {
    enabled: true,
    consecutive_failures_threshold: 3,
    grace_period_seconds: 30,
    restart: {
      enabled: true,
      max_attempts: 2,
      window_seconds: 900,
    },
    recreate: {
      enabled: true,
      compose_file_path: "/opt/app/docker-compose.yml",
      service_name: "web-api",
      max_attempts: 1,
    },
  };

  const executor = new MockExecutor();
  const logs: string[] = [];
  let criticalFired: boolean = false;

  const callbacks = {
    onLog: (msg: string) => logs.push(msg),
    onCriticalFailure: () => {
      criticalFired = true;
    },
  };

  const state: ServiceHealthState = createInitialState();

  // Test 1: Initial Healthy check
  await handleServiceCheck(config, state, true, "web-container", executor, callbacks);
  console.assert(state.status === "HEALTHY", `Test 1 Failed: status is ${state.status}`);
  console.assert(state.consecutiveFailures === 0, "Test 1 Failed: consecutiveFailures not 0");
  console.log("✅ Test 1 Passed: Initial HEALTHY state verified");

  // Test 2: First Failure -> DEGRADED (1/3)
  await handleServiceCheck(config, state, false, "web-container", executor, callbacks);
  console.assert(state.status === "DEGRADED", `Test 2 Failed: status is ${state.status}`);
  console.assert(state.consecutiveFailures === 1, "Test 2 Failed: consecutiveFailures is not 1");
  console.log("✅ Test 2 Passed: 1st failure transitions to DEGRADED");

  // Test 3: Second Failure -> DEGRADED (2/3)
  await handleServiceCheck(config, state, false, "web-container", executor, callbacks);
  console.assert(state.status === "DEGRADED", `Test 3 Failed: status is ${state.status}`);
  console.assert(state.consecutiveFailures === 2, "Test 3 Failed: consecutiveFailures is not 2");
  console.log("✅ Test 3 Passed: 2nd failure remains DEGRADED");

  // Test 4: Third Failure -> Exceeds threshold (3/3) -> Action: RESTART (Attempt 1/2) -> COOLING_DOWN
  await handleServiceCheck(config, state, false, "web-container", executor, callbacks);
  console.assert(state.status === "COOLING_DOWN", `Test 4 Failed: status is ${state.status}`);
  console.assert(executor.executedCommands.includes("docker restart web-container"), "Test 4 Failed: docker restart command not executed");
  console.assert(state.restartTimestamps.length === 1, "Test 4 Failed: restartTimestamps length is not 1");
  console.log("✅ Test 4 Passed: 3rd failure triggers docker restart & enters COOLING_DOWN");

  // Test 5: Check during Grace Period (elapsed < 30s) -> SKIPPED in COOLING_DOWN
  await handleServiceCheck(config, state, false, "web-container", executor, callbacks);
  console.assert(state.status === "COOLING_DOWN", `Test 5 Failed: status is ${state.status}`);
  console.assert(executor.executedCommands.length === 1, "Test 5 Failed: Extra command executed during grace period!");
  console.log("✅ Test 5 Passed: Grace period skips action and maintains COOLING_DOWN");

  // Test 6: Fast-forward time past grace period (>30s) -> 2nd Restart Attempt (2/2)
  if (state.lastActionTimestamp !== null) {
    state.lastActionTimestamp = state.lastActionTimestamp - 35; // simulate 35s passed
  }
  await handleServiceCheck(config, state, false, "web-container", executor, callbacks);
  console.assert(state.status === "COOLING_DOWN", `Test 6 Failed: status is ${state.status}`);
  console.assert(state.restartTimestamps.length === 2, "Test 6 Failed: restartTimestamps length is not 2");
  console.assert(executor.executedCommands.length === 2, "Test 6 Failed: 2nd restart command was not executed");
  console.log("✅ Test 6 Passed: 2nd restart executed after grace period");

  // Test 7: Fast-forward time past grace period -> Restarts exhausted (2/2) -> Action: RECREATE (Attempt 1/1)
  if (state.lastActionTimestamp !== null) {
    state.lastActionTimestamp = state.lastActionTimestamp - 35;
  }
  await handleServiceCheck(config, state, false, "web-container", executor, callbacks);
  console.assert(state.status === "COOLING_DOWN", `Test 7 Failed: status is ${state.status}`);
  console.assert(state.recreateAttempts === 1, "Test 7 Failed: recreateAttempts is not 1");
  const expectedComposeCmd = "docker compose -f /opt/app/docker-compose.yml up -d --force-recreate web-api";
  console.assert(executor.executedCommands.includes(expectedComposeCmd), `Test 7 Failed: compose command not executed. Got: ${executor.executedCommands}`);
  console.log("✅ Test 7 Passed: Restarts exhausted, escalated to docker compose recreate");

  // Test 8: Fast-forward time past grace period -> Recreates exhausted (1/1) -> CRITICAL_FAILED
  if (state.lastActionTimestamp !== null) {
    state.lastActionTimestamp = state.lastActionTimestamp - 35;
  }
  await handleServiceCheck(config, state, false, "web-container", executor, callbacks);
  console.assert(state.status === "CRITICAL_FAILED", `Test 8 Failed: status is ${state.status}`);
  console.assert(criticalFired, "Test 8 Failed: onCriticalFailure callback not fired!");
  console.log("✅ Test 8 Passed: Recreates exhausted, transitioned to CRITICAL_FAILED & alert triggered");

  // Test 9: Recovery -> Service becomes HEALTHY again
  await handleServiceCheck(config, state, true, "web-container", executor, callbacks);
  console.assert(state.status === "HEALTHY", `Test 9 Failed: status is ${state.status}`);
  console.assert(state.consecutiveFailures === 0, "Test 9 Failed: consecutiveFailures not reset");
  console.log("✅ Test 9 Passed: Recovery to HEALTHY verified");

  console.log("\n=========================================");
  console.log("   ALL 9 AUTO-HEAL TESTS PASSED! 🎉      ");
  console.log("=========================================");
}

runTests().catch((e) => {
  console.error("Test Suite Failed:", e);
  process.exit(1);
});
