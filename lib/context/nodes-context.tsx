"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { Node } from "@/lib/features/nodes/types";
import { NodesService } from "@/lib/features/nodes/nodes/services/nodes.service";

interface NodesContextValue {
  allNodes: Node[];
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  refresh: () => void;
  updateNode: (nodeId: string, hostname: string) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
}

const NodesContext = createContext<NodesContextValue | null>(null);

/**
 * Provides a single shared polling interval (10 s) for node data across the
 * entire dashboard. All components that call useNodes() share this one instance,
 * eliminating the N×10 s duplicate API calls that occurred when each component
 * instantiated its own hook.
 */
export function NodesProvider({ children }: { children: ReactNode }) {
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showUpdating = false) => {
    try {
      if (showUpdating) setIsUpdating(true);
      const data = await NodesService.getNodesWithMetrics();
      setAllNodes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load nodes");
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const updateNode = useCallback(
    async (nodeId: string, hostname: string): Promise<void> => {
      setIsUpdating(true);
      try {
        const updated = await NodesService.updateNode(nodeId, hostname);
        setAllNodes((prev) =>
          prev.map((n) => (n.id === nodeId ? { ...n, ...updated } : n))
        );
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {
    setIsUpdating(true);
    try {
      await NodesService.deleteNode(nodeId);
      setAllNodes((prev) => prev.filter((n) => n.id !== nodeId));
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return (
    <NodesContext.Provider
      value={{ allNodes, isLoading, isUpdating, error, refresh, updateNode, deleteNode }}
    >
      {children}
    </NodesContext.Provider>
  );
}

export function useNodesContext(): NodesContextValue {
  const ctx = useContext(NodesContext);
  if (!ctx) throw new Error("useNodesContext must be used within a NodesProvider");
  return ctx;
}
