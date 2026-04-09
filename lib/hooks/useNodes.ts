"use client";

import { useState, useEffect, useCallback } from "react";
import type { Node } from "@/lib/types";
import { fetchWithAuth } from "@/lib/api/fetch-client";

/**
 * Hook para obtener y gestionar la lista de nodos
 */
export function useNodes() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = useCallback(async (showUpdating = false) => {
    try {
      if (showUpdating) setIsUpdating(true);

      const res = await fetchWithAuth("/api/nodes/with-metrics");

      if (!res.ok) {
        throw new Error("Failed to fetch nodes");
      }

      // Los nodos ya vienen mapeados y con el estado calculado desde el servidor
      const nodes: Node[] = await res.json();

      setNodes(nodes);
      setError(null);
    } catch (err) {
      console.error("Error fetching nodes:", err);
      setError("Failed to load servers");
    } finally {
      setIsLoading(false);
      if (showUpdating) setIsUpdating(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchNodes(true);
  }, [fetchNodes]);

  const updateNode = useCallback(async (nodeId: string, hostname: string): Promise<void> => {
    setIsUpdating(true);
    try {
      const res = await fetchWithAuth("/api/nodes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: nodeId, hostname }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al actualizar" }));
        throw new Error(err.error || "Failed to update node");
      }
      const updated: Node = await res.json();
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...updated } : n)));
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {
    setIsUpdating(true);
    try {
      const res = await fetchWithAuth(`/api/nodes/${nodeId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al eliminar" }));
        throw new Error(err.error || "Failed to delete node");
      }
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    } finally {
      setIsUpdating(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();

    // Auto-refresh cada 10 segundos
    const interval = setInterval(() => {
      fetchNodes(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchNodes]);

  return {
    nodes,
    isLoading,
    isUpdating,
    error,
    refresh,
    updateNode,
    deleteNode,
  };
}
