import type {
  AutoHealEvent,
  MonitorIncident,
  ServiceMonitor,
  UptimePoint,
} from "./interfaces/service-monitor";

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

// ─── Auto-heal history ────────────────────────────────────────────────────────

/** "45 s", "3 min 20 s", "2 h 5 min". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const s = Math.round(seconds % 60);
    return s ? `${minutes} min ${s} s` : `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${hours} h ${m} min` : `${hours} h`;
}

/** How an auto-heal event reads in the timeline. */
export function describeAutoHealEvent(e: AutoHealEvent): { title: string; tone: MonitorTone } {
  const attempt = e.maxAttempts > 0 ? ` (${e.attempt}/${e.maxAttempts})` : "";
  switch (e.action) {
    case "restart":
      return e.error
        ? { title: `Restart failed${attempt}`, tone: "bad" }
        : { title: `Restarted the container${attempt}`, tone: "warn" };
    case "recreate":
      return e.error
        ? { title: `Recreate failed${attempt}`, tone: "bad" }
        : { title: `Recreated with Docker Compose${attempt}`, tone: "warn" };
    case "gave_up":
      return { title: "Auto-heal gave up: every step was used and the service is still down", tone: "bad" };
    case "recovered":
      return {
        title:
          e.downtimeSeconds != null
            ? `Service recovered after ${formatDuration(e.downtimeSeconds)} down`
            : "Service recovered",
        tone: "ok",
      };
  }
}

/** Auto-heal events that belong to an incident: from its start until a minute after it ended (or now). */
export function eventsForIncident(incident: MonitorIncident, events: AutoHealEvent[]): AutoHealEvent[] {
  const start = new Date(incident.startedAt).getTime();
  const end = (incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : Date.now()) + 60_000;
  return events.filter((e) => {
    const t = new Date(e.createdAt).getTime();
    return t >= start && t <= end;
  });
}

/** One line for an incident's auto-heal column, e.g. "Restarted 1× → recovered", or null if it did nothing. */
export function summarizeIncidentAutoHeal(events: AutoHealEvent[]): { text: string; tone: MonitorTone } | null {
  if (!events.length) return null;
  const restarts = events.filter((e) => e.action === "restart");
  const recreates = events.filter((e) => e.action === "recreate");
  const failed = [...restarts, ...recreates].filter((e) => e.error).length;
  const steps: string[] = [];
  if (restarts.length) steps.push(`restarted ${restarts.length}×`);
  if (recreates.length) steps.push(`recreated ${recreates.length}×`);
  if (failed) steps.push(`${failed} failed`);

  let outcome: { text: string; tone: MonitorTone } = { text: "", tone: "warn" };
  if (events.some((e) => e.action === "recovered")) outcome = { text: "recovered", tone: "ok" };
  else if (events.some((e) => e.action === "gave_up")) outcome = { text: "gave up", tone: "bad" };

  const text = [steps.join(", "), outcome.text].filter(Boolean).join(" → ");
  return { text: text.charAt(0).toUpperCase() + text.slice(1), tone: outcome.text ? outcome.tone : "warn" };
}
