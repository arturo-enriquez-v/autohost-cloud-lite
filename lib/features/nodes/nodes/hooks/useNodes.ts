"use client";

import { useState, useEffect, useCallback } from "react";
import type { Node } from "../interfaces/Node";
import { NodesService } from "../services/nodes.service";
import { useProjectContext } from "@/lib/context/project-context";


export function useNodes( nodeId: string | undefined = undefined) {
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedProject } = useProjectContext();

   const nodes = selectedProject
    ? allNodes.filter((n) => n.projectId === selectedProject.id)
    : allNodes;

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

    const interval = setInterval(() => {
      load(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const updateNode = useCallback(async (nodeId: string, hostname: string): Promise<void> => {
    setIsUpdating(true);
    try {
      const updated = await NodesService.updateNode(nodeId, hostname);
      setAllNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...updated } : n)));
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {
    setIsUpdating(true);
    try {
      await NodesService.deleteNode(nodeId);
      setAllNodes((prev) => prev.filter((n) => n.id !== nodeId));
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const node = nodeId ? allNodes.find((n) => n.id === nodeId) ?? null : null;

  return { node, nodes, allNodes, isLoading, isUpdating, error, refresh, updateNode, deleteNode };
}

