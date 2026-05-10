import {
  fetchServiceMonitors,
  fetchCreateServiceMonitor,
  fetchUpdateServiceMonitor,
  fetchDeleteServiceMonitor,
  fetchUptimeHistory,
} from "../fetch/service-monitors.client";
import type {
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

  async getUptimeHistory(nodeId: string, monitorId: string): Promise<UptimePoint[]> {
    const res = await fetchUptimeHistory(nodeId, monitorId);
    if (!res.ok) return [];
    const data: UptimePoint[] = await res.json();
    return data ?? [];
  },
};
