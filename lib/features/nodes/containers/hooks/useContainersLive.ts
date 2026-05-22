"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { DockerContainer, ContainerAction } from "../../types";
import { runContainerAction } from "../../api";

export type { ContainerAction } from "../../types";

/** Shape of the `containers` + `error` fields in the SSE `containers` event. */
interface ContainerListEvent {
  containers: DockerContainer[];
  error?: string;
}

function isDockerUnavailableError(msg: string): boolean {
  return (
    msg.includes("executable file not found") ||
    msg.includes("docker: not found") ||
    msg.includes("permission denied") ||
    msg.includes("Cannot connect to the Docker daemon")
  );
}

function containersStreamUrl(nodeId: string): string {
  return `/api/nodes/${nodeId}/containers/stream`;
}

/**
 * Connects to the containers SSE endpoint and keeps the latest snapshot in state.
 *
 * - The server sends a `StreamContainers` gRPC command to the agent on first
 *   subscriber.  The agent responds with an initial snapshot and re-sends
 *   whenever Docker events change the container list.
 * - Automatically pauses when the browser tab is hidden and reconnects when
 *   visible again, reducing unnecessary server load.
 * - `runAction` (start / stop / restart) still dispatches a job; the agent
 *   picks up the resulting container state change via `docker events` and
 *   pushes a new snapshot automatically.
 */
export function useContainersLive(nodeId: string) {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [connected, setConnected] = useState(false);
  const [dockerUnavailable, setDockerUnavailable] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<{ name: string; action: ContainerAction } | null>(null);

  const esRef = useRef<EventSource | null>(null);

  // Page Visibility: pause SSE when tab is hidden.
  const [visible, setVisible] = useState(() =>
    typeof document !== "undefined" ? !document.hidden : true
  );
  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Allow the user to manually reconnect after an error.
  const [reconnectKey, setReconnectKey] = useState(0);
  const reconnect = useCallback(() => setReconnectKey((k) => k + 1), []);

  useEffect(() => {
    if (!nodeId || !visible) return;

    const es = new EventSource(containersStreamUrl(nodeId), { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setStreamError(null);
    };

    es.addEventListener("containers", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as ContainerListEvent;
        if (data.error) {
          setStreamError(data.error);
          if (isDockerUnavailableError(data.error)) {
            setDockerUnavailable(true);
          }
          return;
        }
        setContainers(data.containers ?? []);
        setDockerUnavailable(false);
        setStreamError(null);
      } catch {
        // malformed frame — ignore
      }
    });

    es.addEventListener("server-error", (event) => {
      const data = (event as MessageEvent).data;
      try {
        const parsed = JSON.parse(data) as { message: string };
        setStreamError(parsed.message);
      } catch {
        setStreamError("Node not connected");
      }
      setConnected(false);
    });

    es.onerror = () => {
      setConnected(false);
      setStreamError("Connection lost — reconnecting…");
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [nodeId, visible, reconnectKey]);

  const runAction = useCallback(
    async (name: string, action: ContainerAction) => {
      setActionState({ name, action });
      try {
        await runContainerAction(nodeId, name, action);
        // Agent detects the state change via `docker events` and pushes a new
        // snapshot automatically — no need to poll or call refresh() here.
      } finally {
        setActionState(null);
      }
    },
    [nodeId]
  );

  return {
    containers,
    connected,
    streamError,
    dockerUnavailable,
    actionState,
    reconnect,
    runAction,
  };
}
