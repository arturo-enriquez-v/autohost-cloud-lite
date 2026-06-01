import { fetchAlertEvents } from "../fetch/alert.client";
import type { AlertFilters } from "../fetch/alert.server";
import type { AlertEvent } from "../interfaces/alert";

export interface AlertEventsPage {
  events: AlertEvent[];
  total: number;
}

export const AlertService = {
  async getAlertEvents(
    limit = 20,
    offset = 0,
    filters: AlertFilters = {}
  ): Promise<AlertEventsPage> {
    const res = await fetchAlertEvents(limit, offset, filters);
    if (!res.ok) throw new Error("Failed to fetch alert events");
    return res.json();
  },
};
