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
 * Automatically pauses the SSE connection when the browser tab is hidden and
 * reconnects when it becomes visible again, reducing unnecessary server load.
 */
export function useNodeMetricsLive(nodeId: string): UseNodeMetricsLiveReturn {
  const [metric, setMetric] = useState<LiveMetric | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const [visible, setVisible] = useState(() =>
    typeof document !== "undefined" ? !document.hidden : true
  );

  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (!nodeId || !visible) return;

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
  }, [nodeId, visible]);

  return { metric, connected, error };
}
