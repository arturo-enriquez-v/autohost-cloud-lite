/**
 * Calcula el estado de un nodo basado en su LastSeenAt
 * @param lastSeenAt - Timestamp ISO del último heartbeat
 * @param intervalSeconds - Intervalo de actualización en segundos (default: 15)
 * @param maxMissedIntervals - Número de intervalos perdidos antes de marcar offline (default: 3)
 * @returns "online" | "offline"
 */
export function calculateNodeStatus(
  lastSeenAt: string | undefined,
  intervalSeconds: number = 15,
  maxMissedIntervals: number = 3
): "online" | "offline" {
  if (!lastSeenAt) {
    return "offline";
  }

  try {
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffInMs = now.getTime() - lastSeen.getTime();
    const diffInSeconds = diffInMs / 1000;

    // Si pasaron más de (intervalSeconds * maxMissedIntervals) segundos, está offline
    const maxOfflineSeconds = intervalSeconds * maxMissedIntervals;

    return diffInSeconds <= maxOfflineSeconds ? "online" : "offline";
  } catch (error) {
    console.error("Error calculating node status:", error);
    return "offline";
  }
}

/**
 * Calcula el tiempo transcurrido desde el último heartbeat
 * @param lastSeenAt - Timestamp ISO del último heartbeat
 * @returns String formateado (e.g., "2 min ago", "1 hour ago")
 */
export function getTimeSinceLastSeen(lastSeenAt: string | undefined): string {
  if (!lastSeenAt) {
    return "Never";
  }

  try {
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffInMs = now.getTime() - lastSeen.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} sec ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  } catch (error) {
    console.error("Error calculating time since last seen:", error);
    return "Unknown";
  }
}

/** "3d 4h 12m", "5h 2m" or "38m". */
export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/**
 * Current uptime of an online node: the uptime of its last stored metric plus the time since that
 * metric. Undefined when the node is offline or the API did not send uptime.
 */
export function currentUptimeSeconds(node: {
  status: string
  uptimeSeconds?: number
  metricCollectedAt?: string
}): number | undefined {
  if (node.status !== "online" || node.uptimeSeconds == null) return undefined
  const collected = node.metricCollectedAt ? new Date(node.metricCollectedAt).getTime() : NaN
  const elapsed = Number.isNaN(collected) ? 0 : Math.max(0, (Date.now() - collected) / 1000)
  return node.uptimeSeconds + elapsed
}
