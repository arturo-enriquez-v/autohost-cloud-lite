import {
  fetchServiceMonitors,
  fetchCreateServiceMonitor,
  fetchUpdateServiceMonitor,
  fetchDeleteServiceMonitor,
  fetchUptimeHistory,
  fetchEventHistory,
  fetchCheckServiceMonitorNow,
  fetchMonitorStats,
  fetchMonitorIncidents,
  fetchAutoHealEvents,
} from "../fetch/service-monitors.client";
import type { MetricRange } from "@/lib/features/nodes/types";
import type {
  AutoHealEvent,
  MonitorIncident,
  MonitorStats,
  ServiceHealthEvent,
  ServiceMonitor,
  UptimePoint,
  UpsertServiceMonitorPayload,
} from "../interfaces/service-monitor";

export const ServiceMonitorService = {
  async getMonitors(nodeId: string): Promise<ServiceMonitor[]> {
    const res = await fetchServiceMonitors(nodeId);
    if (!res.ok) throw new Error("Failed to fetch service monitors");
    const data: ServiceMonitor[] = await res.json();
    return data ?? [];
  },

  async createMonitor(
    nodeId: string,
    payload: UpsertServiceMonitorPayload
  ): Promise<ServiceMonitor> {
    const res = await fetchCreateServiceMonitor(nodeId, payload);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Failed to create monitor");
    }
    return res.json();
  },

  async updateMonitor(
    nodeId: string,
    monitorId: string,
    payload: UpsertServiceMonitorPayload
  ): Promise<ServiceMonitor> {
    const res = await fetchUpdateServiceMonitor(nodeId, monitorId, payload);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Failed to update monitor");
    }
    return res.json();
  },

  async deleteMonitor(nodeId: string, monitorId: string): Promise<void> {
    const res = await fetchDeleteServiceMonitor(nodeId, monitorId);
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Failed to delete monitor");
    }
  },

  async getEventHistory(nodeId: string, monitorId: string, limit = 20): Promise<ServiceHealthEvent[]> {
    const res = await fetchEventHistory(nodeId, monitorId, limit);
    if (!res.ok) throw new Error("Failed to fetch check history");
    const data: ServiceHealthEvent[] = await res.json();
    return data ?? [];
  },

  /** Asks the agent to run the check now. Throws with the API's reason (paused, node offline). */
  async checkNow(nodeId: string, monitorId: string): Promise<void> {
    const res = await fetchCheckServiceMonitorNow(nodeId, monitorId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Failed to run the check");
    }
  },

  async getStats(nodeId: string, monitorId: string, range: MetricRange): Promise<MonitorStats> {
    const res = await fetchMonitorStats(nodeId, monitorId, range);
    if (!res.ok) throw new Error("Failed to fetch monitor stats");
    return res.json();
  },

  async getIncidents(nodeId: string, monitorId: string, range: MetricRange): Promise<MonitorIncident[]> {
    const res = await fetchMonitorIncidents(nodeId, monitorId, range);
    if (!res.ok) throw new Error("Failed to fetch incidents");
    const data: MonitorIncident[] = await res.json();
    return data ?? [];
  },

  async getAutoHealEvents(nodeId: string, monitorId: string, range: MetricRange): Promise<AutoHealEvent[]> {
    const res = await fetchAutoHealEvents(nodeId, monitorId, range);
    if (!res.ok) throw new Error("Failed to fetch auto-heal history");
    const data: AutoHealEvent[] = await res.json();
    return data ?? [];
  },

  async getUptimeHistory(nodeId: string, monitorId: string): Promise<UptimePoint[]> {
    const res = await fetchUptimeHistory(nodeId, monitorId);
    if (!res.ok) return [];
    const data: UptimePoint[] = await res.json();
    return data ?? [];
  },
};
