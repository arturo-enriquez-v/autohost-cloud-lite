"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ContainerMetricHistoryPoint, MetricRange } from "@/lib/features/nodes/types";
import { METRIC_RANGE_CONFIG } from "@/lib/features/nodes/types";
import { fetchContainerMetricsHistory } from "@/lib/features/nodes/api";

const REFRESH_INTERVAL_MS = 30_000;

export function useContainerMetrics(
  nodeId: string,
  containerNameOrId: string,
  range: MetricRange = "7d",
  enabled: boolean = true
) {
  const [points, setPoints] = useState<ContainerMetricHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!nodeId || !containerNameOrId || !enabled) return;
    try {
      const data = await fetchContainerMetricsHistory(nodeId, containerNameOrId, range);
      setPoints(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[useContainerMetrics] fetch error:", err);
      setError("Failed to load container metrics");
    } finally {
      setIsLoading(false);
    }
  }, [nodeId, containerNameOrId, range, enabled]);

  useEffect(() => {
    if (!enabled || !nodeId || !containerNameOrId) return;
    setIsLoading(true);
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMetrics, enabled, nodeId, containerNameOrId]);

  return { points, isLoading, error, lastUpdated, refresh: fetchMetrics, rangeConfig: METRIC_RANGE_CONFIG };
}
