import type { ServiceMonitor, UptimePoint } from "./interfaces/service-monitor";

/** How a monitor's state reads at a glance: green, amber, red or grey. */
export type MonitorTone = "ok" | "warn" | "bad" | "muted";

export interface MonitorState {
  label: string;
  tone: MonitorTone;
}

/**
 * The single status shown for a monitor. Paused and stale monitors hide their last status, which is out of
 * date; "Failing" counts towards the threshold at which the monitor is marked down (and auto-heal acts).
 */
export function monitorState(m: ServiceMonitor): MonitorState {
  if (!m.enabled) return { label: "Paused", tone: "muted" };
  if (m.stale) return { label: "No recent data", tone: "muted" };
  switch (m.status) {
    case "healthy":
      return { label: m.lastLatencyMs > 0 ? `Healthy · ${m.lastLatencyMs} ms` : "Healthy", tone: "ok" };
    case "degraded":
      return {
        label: `Failing (${Math.min(m.consecutiveFailures, m.failureThreshold)}/${m.failureThreshold})`,
        tone: "warn",
      };
    case "down":
      return { label: "Down", tone: "bad" };
    default:
      return { label: "Waiting for first check", tone: "muted" };
  }
}

/** What auto-heal is doing right now, or null when it is idle (or off). */
export function autoHealActivity(m: ServiceMonitor): MonitorState | null {
  if (!m.autoHealConfig?.enabled || !m.enabled || m.stale) return null;
  switch (m.autoHealState?.status) {
    case "RESTARTING":
      return { label: "Restarting container", tone: "warn" };
    case "RECREATING":
      return { label: "Recreating with Compose", tone: "warn" };
    case "COOLING_DOWN":
      return { label: "Waiting after auto-heal action", tone: "warn" };
    case "CRITICAL_FAILED":
      return { label: "Auto-heal gave up", tone: "bad" };
    default:
      return null;
  }
}

/** What the monitor checks, in words. */
export function describeTarget(m: ServiceMonitor): string {
  switch (m.checkType) {
    case "http":
      return `${m.httpUrl} → ${m.httpExpectedStatus}`;
    case "tcp":
      return `${m.tcpHost}:${m.tcpPort}`;
    default:
      return `Container ${m.serviceName} is running`;
  }
}

/** The container auto-heal acts on: the one configured, or the monitor's name. */
export function autoHealContainer(m: ServiceMonitor): string {
  return m.autoHealConfig?.container || m.serviceName;
}

/** The auto-heal steps that are on, e.g. "restart, then recreate web-1", or null when auto-heal is off. */
export function describeAutoHeal(m: ServiceMonitor): string | null {
  const cfg = m.autoHealConfig;
  if (!cfg?.enabled) return null;
  const steps = [cfg.restart?.enabled && "restart", cfg.recreate?.enabled && "recreate"].filter(Boolean);
  if (!steps.length) return "no action enabled";
  // Container checks act on the container shown as the monitor's name; say which one otherwise.
  const target = m.checkType === "process" ? "" : ` ${autoHealContainer(m)}`;
  return steps.join(", then ") + target;
}

/** Share of passed checks over the points, or null without data. Uses per-bucket counts when available. */
export function uptimePercent(points: UptimePoint[]): number | null {
  let up = 0;
  let total = 0;
  for (const p of points) {
    if (p.status === "no_data") continue;
    if (p.up !== null && p.down !== null) {
      up += p.up;
      total += p.up + p.down;
    } else {
      up += p.status === "up" ? 1 : 0;
      total += 1;
    }
  }
  return total === 0 ? null : (up / total) * 100;
}

/** "100%", or one decimal rounded down so a failure never reads as 100%. */
export function formatPercent(value: number): string {
  if (value >= 100) return "100%";
  return `${(Math.floor(value * 10) / 10).toFixed(1)}%`;
}

/** Colour of an uptime bucket: all checks passed, some failed, all failed, or no checks. */
export function bucketTone(p: UptimePoint): MonitorTone {
  if (p.status === "no_data") return "muted";
  if (p.up !== null && p.down !== null) {
    if (p.down === 0) return "ok";
    return p.up === 0 ? "bad" : "warn";
  }
  return p.status === "up" ? "ok" : "bad";
}
