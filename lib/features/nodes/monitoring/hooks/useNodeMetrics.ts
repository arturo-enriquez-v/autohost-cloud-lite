"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { NodeMetricHistoryPoint, MetricRange } from "../../types";
import { METRIC_RANGE_CONFIG } from "../../types";
import { fetchNodeMetricsHistory } from "../../api";

export type { MetricRange } from "../../types";

const REFRESH_INTERVAL_MS = 30_000;

export function useNodeMetrics(nodeId: string, range: MetricRange = "7d") {
  const [points, setPoints] = useState<NodeMetricHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await fetchNodeMetricsHistory(nodeId, range);
      setPoints(data);
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

  return { points, isLoading, error, lastUpdated, refresh: fetchMetrics, rangeConfig: METRIC_RANGE_CONFIG };
}
