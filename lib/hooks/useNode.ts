"use client";

import { useState, useEffect, useCallback } from "react";
import type { Node } from "@/lib/types";
import { fetchWithAuth } from "@/lib/api/fetch-client";

export function useNode(nodeId: string) {
  const [node, setNode] = useState<Node | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNode = useCallback(async () => {
    try {
      // Try the dedicated single-node endpoint first
      let res = await fetchWithAuth(`/api/nodes/${nodeId}`);

      if (!res.ok) {
        // Fallback: fetch the full list with metrics and find by id
        const listRes = await fetchWithAuth("/api/nodes/with-metrics");
        if (!listRes.ok) throw new Error("Failed to fetch node");
        const nodes: Node[] = await listRes.json();
        const found = nodes.find((n) => n.id === nodeId) ?? null;
        setNode(found);
        setError(null);
        return;
      }

      const data: Node = await res.json();
      setNode(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching node:", err);
      setError("Failed to load node");
    } finally {
      setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchNode();
  }, [fetchNode]);

  return { node, isLoading, error };
}
