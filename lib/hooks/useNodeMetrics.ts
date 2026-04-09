"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/lib/api/fetch-client";
import type { NodeMetricHistoryPoint } from "@/lib/types";

export type MetricRange = "1d" | "7d" | "30d";

const RANGE_CONFIG: Record<MetricRange, { days: number; bucket: string; label: string }> = {
  "1d": { days: 1, bucket: "minute", label: "Last 24h" },
  "7d": { days: 7, bucket: "hour", label: "Last 7 days" },
  "30d": { days: 30, bucket: "day", label: "Last 30 days" },
};

const REFRESH_INTERVAL_MS = 30_000; // 30 seconds

export function useNodeMetrics(nodeId: string, range: MetricRange = "7d") {
  const [points, setPoints] = useState<NodeMetricHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    const { days, bucket } = RANGE_CONFIG[range];
    const to = new Date().toISOString();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    try {
      const res = await fetchWithAuth(
        `/api/nodes/${nodeId}/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&bucket=${bucket}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NodeMetricHistoryPoint[] = await res.json();
      setPoints(Array.isArray(data) ? data : []);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[useNodeMetrics] fetch error:", err);
      setError("Failed to load metrics");
    } finally {
      setIsLoading(false);
    }
  }, [nodeId, range]);

  useEffect(() => {
    setIsLoading(true);
    fetchMetrics();

    intervalRef.current = setInterval(fetchMetrics, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMetrics]);

  return { points, isLoading, error, lastUpdated, refresh: fetchMetrics, rangeConfig: RANGE_CONFIG };
}
