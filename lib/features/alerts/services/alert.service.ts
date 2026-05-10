import { fetchAlertEvents } from "../fetch/alert.client";
import type { AlertEvent } from "../interfaces/alert";

export const AlertService = {
  async getAlertEvents(limit = 50, offset = 0): Promise<AlertEvent[]> {
    const res = await fetchAlertEvents(limit, offset);
    if (!res.ok) throw new Error("Failed to fetch alert events");
    return res.json();
  },
};
