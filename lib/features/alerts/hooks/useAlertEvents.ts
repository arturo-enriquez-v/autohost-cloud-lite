"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api/fetch-client";
import type { AlertEvent } from "@/lib/types";

export function useAlertEvents(limit = 50) {
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/alert-events?limit=${limit}&offset=0`);
      if (!res.ok) throw new Error("Failed to fetch alert events");
      const data: AlertEvent[] = await res.json();
      setEvents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, isLoading, error, refresh: fetchEvents };
}
