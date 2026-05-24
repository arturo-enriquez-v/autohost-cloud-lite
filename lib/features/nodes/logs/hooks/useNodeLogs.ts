"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { LogEntry } from "../interfaces/log";
import { liveLogsUrl } from "../fetch/logs.client";

export type { LogEntry } from "../interfaces/log";

export interface LogError {
  message: string;
}

interface UseNodeLogsOptions {
  unit?: string;
  lines?: number;
  maxEntries?: number;
}

interface UseNodeLogsReturn {
  logs: LogEntry[];
  connected: boolean;
  error: string | null;
  clear: () => void;
}

/**
 * Streams real-time logs from a node via Server-Sent Events.
 * Connects to /api/nodes/{nodeId}/logs/stream and appends entries to `logs`.
 * Automatically pauses the SSE connection when the browser tab is hidden and
 * reconnects when it becomes visible again, reducing unnecessary server load.
 */
export function useNodeLogs(
  nodeId: string,
  { unit = "", lines = 100, maxEntries = 1000 }: UseNodeLogsOptions = {}
): UseNodeLogsReturn {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  // Batch incoming SSE messages and flush once per animation frame to avoid
  // O(n) array allocations and React re-renders at the raw log ingestion rate.
  const pendingRef = useRef<LogEntry[]>([]);
  const rafRef = useRef<number | null>(null);

  const [visible, setVisible] = useState(() =>
    typeof document !== "undefined" ? !document.hidden : true
  );

  const clear = useCallback(() => setLogs([]), []);

  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (!nodeId || !visible) return;

    const url = liveLogsUrl(nodeId, unit, lines);

    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (event) => {
      try {
        const entry: LogEntry = JSON.parse(event.data);
        pendingRef.current.push(entry);
        // Schedule a single flush per animation frame so React re-renders at
        // most ~60 times/s regardless of the log ingestion rate.
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const batch = pendingRef.current;
            pendingRef.current = [];
            setLogs((prev) => {
              const combined = [...prev, ...batch];
              return combined.length > maxEntries
                ? combined.slice(combined.length - maxEntries)
                : combined;
            });
          });
        }
      } catch {
        // Ignore malformed events
      }
    };

    es.addEventListener("server-error", (event) => {
      const me = event as MessageEvent;
      try {
        const err: LogError = JSON.parse(me.data);
        setError(err.message);
      } catch {
        // ignore
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
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingRef.current = [];
    };
  }, [nodeId, unit, lines, maxEntries, visible]);

  return { logs, connected, error, clear };
}
