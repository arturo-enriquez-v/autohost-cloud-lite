"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ServiceMonitor, UpsertServiceMonitorPayload, UptimePoint } from "../interfaces/service-monitor";
import { ServiceMonitorService } from "../services/service-monitor.service";

export function useServiceMonitors(nodeId: string) {
  const [monitors, setMonitors] = useState<ServiceMonitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await ServiceMonitorService.getMonitors(nodeId);
      setMonitors(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    initialLoadDone.current = false;
    refresh(false).then(() => {
      initialLoadDone.current = true;
    });
    const interval = setInterval(() => refresh(true), 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const create = useCallback(
    async (payload: UpsertServiceMonitorPayload): Promise<ServiceMonitor> => {
      const created = await ServiceMonitorService.createMonitor(nodeId, payload);
      setMonitors((prev) => [...prev, created]);
      return created;
    },
    [nodeId]
  );

  const update = useCallback(
    async (monitorId: string, payload: UpsertServiceMonitorPayload): Promise<ServiceMonitor> => {
      const updated = await ServiceMonitorService.updateMonitor(nodeId, monitorId, payload);
      setMonitors((prev) => prev.map((m) => (m.id === monitorId ? updated : m)));
      return updated;
    },
    [nodeId]
  );

  const remove = useCallback(
    async (monitorId: string): Promise<void> => {
      await ServiceMonitorService.deleteMonitor(nodeId, monitorId);
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
      ServiceMonitorService.getUptimeHistory(nodeId, monitorId)
        .then((data) => setPoints(data))
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
