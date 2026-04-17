"use client";

import { useEffect, useRef, useState } from "react";

export interface LiveMetric {
  cpu_usage_percent: number;
  ram_total_bytes: number;
  ram_used_bytes: number;
  ram_available_bytes: number;
  ram_usage_percent: number;
  disk_total_bytes: number;
  disk_used_bytes: number;
  disk_available_bytes: number;
  disk_usage_percent: number;
  uptime_seconds: number;
  collected_at: string;
}

interface UseNodeMetricsLiveReturn {
  metric: LiveMetric | null;
  connected: boolean;
  error: string | null;
}

/**
 * Connects to /api/nodes/{nodeId}/metrics/live via Server-Sent Events and
 * keeps the latest metric snapshot in state.
 */
export function useNodeMetricsLive(nodeId: string): UseNodeMetricsLiveReturn {
  const [metric, setMetric] = useState<LiveMetric | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!nodeId) return;

    const url = `/api/nodes/${nodeId}/metrics/live`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.addEventListener("metric", (event) => {
      try {
        const data: LiveMetric = JSON.parse((event as MessageEvent).data);
        setMetric(data);
      } catch {
        // malformed frame — ignore
      }
    });

    es.onerror = () => {
      setConnected(false);
      setError("Connection lost — retrying…");
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [nodeId]);

  return { metric, connected, error };
}
