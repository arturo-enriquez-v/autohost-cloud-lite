"use client";

import { useState, useEffect, useCallback } from "react";
import type { NodeCommand } from "../../types";
import { fetchNodeCommands } from "../../api";

export function useNodeCommands(nodeId: string) {
  const [commands, setCommands] = useState<NodeCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommands = useCallback(async () => {
    try {
      const data = await fetchNodeCommands(nodeId);
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
