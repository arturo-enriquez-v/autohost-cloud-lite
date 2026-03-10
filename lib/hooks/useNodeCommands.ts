"use client";

import { useState, useEffect, useCallback } from "react";
import type { NodeCommand } from "@/lib/types";
import { fetchWithAuth } from "@/lib/api/fetch-client";

export function useNodeCommands(nodeId: string) {
  const [commands, setCommands] = useState<NodeCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommands = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/nodes/${nodeId}/commands`);
      if (!res.ok) throw new Error("Failed to fetch commands");
      const data: NodeCommand[] = await res.json();
      setCommands(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  return { commands, isLoading, error, refresh: fetchCommands };
}
