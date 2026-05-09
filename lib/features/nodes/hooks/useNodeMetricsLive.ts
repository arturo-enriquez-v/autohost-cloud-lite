"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveMetric } from "../types";
import { liveMetricsUrl } from "../api";

export type { LiveMetric } from "../types";

interface UseNodeMetricsLiveReturn {
  metric: LiveMetric | null;
  connected: boolean;
  error: string | null;
}

/**
 * Connects to the live metrics SSE endpoint and keeps the latest snapshot in state.
 */
export function useNodeMetricsLive(nodeId: string): UseNodeMetricsLiveReturn {
  const [metric, setMetric] = useState<LiveMetric | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!nodeId) return;

    const es = new EventSource(liveMetricsUrl(nodeId), { withCredentials: true });
    esRef.current = es;

    es.onopen = () => { setConnected(true); setError(null); };

    es.addEventListener("metric", (event) => {
      try {
        setMetric(JSON.parse((event as MessageEvent).data) as LiveMetric);
      } catch {
        // malformed frame — ignore
      }
    });

    es.onerror = () => { setConnected(false); setError("Connection lost — retrying…"); };

    return () => { es.close(); esRef.current = null; setConnected(false); };
  }, [nodeId]);

  return { metric, connected, error };
}
