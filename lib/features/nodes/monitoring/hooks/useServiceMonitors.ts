"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  ServiceHealthEvent,
  ServiceMonitor,
  UpsertServiceMonitorPayload,
  UptimePoint,
} from "../interfaces/service-monitor";
import { ServiceMonitorService } from "../services/service-monitor.service";

// The agent checks a monitor as soon as it gets its configuration; refresh once its result is likely in.
const RESULT_DELAY_MS = 3000;

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

  const refreshSoon = useCallback(() => {
    setTimeout(() => refresh(true), RESULT_DELAY_MS);
  }, [refresh]);

  useEffect(() => {
    initialLoadDone.current = false;
    refresh(false).then(() => {
      initialLoadDone.current = true;
    });
    const interval = setInterval(() => {
      if (!document.hidden) refresh(true);
    }, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const create = useCallback(
    async (payload: UpsertServiceMonitorPayload): Promise<ServiceMonitor> => {
      const created = await ServiceMonitorService.createMonitor(nodeId, payload);
      setMonitors((prev) => [...prev, created]);
      refreshSoon();
      return created;
    },
    [nodeId, refreshSoon]
  );

  const update = useCallback(
    async (monitorId: string, payload: UpsertServiceMonitorPayload): Promise<ServiceMonitor> => {
      const updated = await ServiceMonitorService.updateMonitor(nodeId, monitorId, payload);
      // The update response has no latest-result fields; keep the ones from the list until the refresh.
      setMonitors((prev) =>
        prev.map((m) =>
          m.id === monitorId ? { ...updated, lastMessage: m.lastMessage, lastLatencyMs: m.lastLatencyMs } : m
        )
      );
      refreshSoon();
      return updated;
    },
    [nodeId, refreshSoon]
  );

  const checkNow = useCallback(
    async (monitorId: string): Promise<void> => {
      await ServiceMonitorService.checkNow(nodeId, monitorId);
      refreshSoon();
    },
    [nodeId, refreshSoon]
  );

  const remove = useCallback(
    async (monitorId: string): Promise<void> => {
      await ServiceMonitorService.deleteMonitor(nodeId, monitorId);
      setMonitors((prev) => prev.filter((m) => m.id !== monitorId));
    },
    [nodeId]
  );

  return { monitors, isLoading, error, refresh, create, update, remove, checkNow };
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

/** The latest check results of a monitor, loaded while `enabled` (e.g. the history is expanded). */
export function useEventHistory(nodeId: string, monitorId: string, enabled: boolean, limit = 20) {
  const [events, setEvents] = useState<ServiceHealthEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = (showLoading: boolean) => {
      if (showLoading) setIsLoading(true);
      ServiceMonitorService.getEventHistory(nodeId, monitorId, limit)
        .then((data) => {
          if (!cancelled) {
            setEvents(data);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
        })
        .finally(() => {
          if (!cancelled && showLoading) setIsLoading(false);
        });
    };
    load(true);
    const interval = setInterval(() => {
      if (!document.hidden) load(false);
    }, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [nodeId, monitorId, enabled, limit]);

  return { events, isLoading, error };
}
