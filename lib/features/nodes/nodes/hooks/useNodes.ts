"use client";

import { useNodesContext } from "@/lib/context/nodes-context";
import { useProjectContext } from "@/lib/context/project-context";

/**
 * Thin hook over NodesContext. All callers share the single polling interval
 * and data store owned by NodesProvider (in the dashboard layout).
 * Accepts an optional nodeId to derive the matching single node.
 */
export function useNodes(nodeId: string | undefined = undefined) {
  const { allNodes, isLoading, isUpdating, error, refresh, updateNode, deleteNode } =
    useNodesContext();
  const { selectedProject } = useProjectContext();

  const nodes = selectedProject
    ? allNodes.filter((n) => n.projectId === selectedProject.id)
    : allNodes;

  const node = nodeId ? (allNodes.find((n) => n.id === nodeId) ?? null) : null;

  return { node, nodes, allNodes, isLoading, isUpdating, error, refresh, updateNode, deleteNode };
}

