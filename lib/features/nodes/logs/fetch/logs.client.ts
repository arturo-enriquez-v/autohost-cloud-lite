export function liveLogsUrl(nodeId: string, unit = "", lines = 100): string {
  const params = new URLSearchParams();
  if (unit) params.set("unit", unit);
  params.set("lines", String(lines));
  return `/api/nodes/${nodeId}/logs/stream?${params.toString()}`;
}
