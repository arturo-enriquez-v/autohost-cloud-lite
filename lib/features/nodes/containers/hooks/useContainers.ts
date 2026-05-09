"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { DockerContainer, ContainerAction } from "../../types";
import { fetchContainers, runContainerAction } from "../../api";

export type { ContainerAction } from "../../types";

const AUTO_REFRESH_MS = 10_000;

function isDockerUnavailableError(msg: string): boolean {
  return (
    msg.includes("executable file not found") ||
    msg.includes("docker: not found") ||
    msg.includes("permission denied") ||
    msg.includes("Cannot connect to the Docker daemon")
  );
}

export function useContainers(nodeId: string) {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [dockerUnavailable, setDockerUnavailable] = useState(false);
  const [actionState, setActionState] = useState<{ name: string; action: ContainerAction } | null>(null);
  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const parsed = await fetchContainers(nodeId);
      setContainers(parsed);
      setLastRefreshed(new Date());
      setDockerUnavailable(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to list containers";
      setRefreshError(msg);
      if (isDockerUnavailableError(msg)) {
        setDockerUnavailable(true);
      }
    } finally {
      setIsRefreshing(false);
      refreshingRef.current = false;
    }
  }, [nodeId]);

  useEffect(() => {
    if (dockerUnavailable) return;
    const id = setInterval(refresh, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh, dockerUnavailable]);

  const runAction = useCallback(
    async (name: string, action: ContainerAction) => {
      setActionState({ name, action });
      try {
        await runContainerAction(nodeId, name, action);
      } finally {
        setActionState(null);
        await refresh();
      }
    },
    [nodeId, refresh]
  );

  return { containers, isRefreshing, lastRefreshed, refreshError, dockerUnavailable, actionState, refresh, runAction };
}
