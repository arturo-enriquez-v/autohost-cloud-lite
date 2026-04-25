"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/lib/api/fetch-client";
import type { ServiceMonitor, UpsertServiceMonitorPayload, UptimePoint } from "@/lib/types";

export function useServiceMonitors(nodeId: string) {
  const [monitors, setMonitors] = useState<ServiceMonitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/nodes/${nodeId}/service-monitors`);
      if (!res.ok) throw new Error("Failed to fetch service monitors");
      const data: ServiceMonitor[] = await res.json();
      setMonitors(data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    initialLoadDone.current = false;
    refresh(false).then(() => { initialLoadDone.current = true; });
    const interval = setInterval(() => refresh(true), 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const create = useCallback(
    async (payload: UpsertServiceMonitorPayload): Promise<ServiceMonitor> => {
      const res = await fetchWithAuth(`/api/nodes/${nodeId}/service-monitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create monitor");
      }
      const created: ServiceMonitor = await res.json();
      setMonitors((prev) => [...prev, created]);
      return created;
    },
    [nodeId]
  );

  const update = useCallback(
    async (monitorId: string, payload: UpsertServiceMonitorPayload): Promise<ServiceMonitor> => {
      const res = await fetchWithAuth(
        `/api/nodes/${nodeId}/service-monitors/${monitorId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update monitor");
      }
      const updated: ServiceMonitor = await res.json();
      setMonitors((prev) => prev.map((m) => (m.id === monitorId ? updated : m)));
      return updated;
    },
    [nodeId]
  );

  const remove = useCallback(
    async (monitorId: string): Promise<void> => {
      const res = await fetchWithAuth(
        `/api/nodes/${nodeId}/service-monitors/${monitorId}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete monitor");
      }
      setMonitors((prev) => prev.filter((m) => m.id !== monitorId));
    },
    [nodeId]
  );

  return { monitors, isLoading, error, refresh, create, update, remove };
}

export function useUptimeHistory(nodeId: string, monitorId: string | null) {
  const [points, setPoints] = useState<UptimePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPoints = useCallback(
    (showLoading: boolean) => {
      if (!monitorId) return;
      if (showLoading) setIsLoading(true);
      fetchWithAuth(`/api/nodes/${nodeId}/service-monitors/${monitorId}/uptime`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data: UptimePoint[]) => setPoints(data ?? []))
        .catch(() => {})
        .finally(() => { if (showLoading) setIsLoading(false); });
    },
    [nodeId, monitorId]
  );

  useEffect(() => {
    fetchPoints(true);
    const interval = setInterval(() => fetchPoints(false), 60_000);
    return () => clearInterval(interval);
  }, [fetchPoints]);

  return { points, isLoading };
}
