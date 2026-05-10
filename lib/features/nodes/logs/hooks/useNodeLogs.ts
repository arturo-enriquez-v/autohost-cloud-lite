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
 */
export function useNodeLogs(
  nodeId: string,
  { unit = "", lines = 100, maxEntries = 1000 }: UseNodeLogsOptions = {}
): UseNodeLogsReturn {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const clear = useCallback(() => setLogs([]), []);

  useEffect(() => {
    if (!nodeId) return;

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
        setLogs((prev) => {
          const next = [...prev, entry];
          return next.length > maxEntries ? next.slice(next.length - maxEntries) : next;
        });
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
    };
  }, [nodeId, unit, lines, maxEntries]);

  return { logs, connected, error, clear };
}
