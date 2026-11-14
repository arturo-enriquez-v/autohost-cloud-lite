"use client";

import { useCallback } from "react";
import { useCurrentUser } from "@/lib/context/current-user-context";
import { useNodesContext } from "@/lib/context/nodes-context";
import { hasPermission } from "../permissions";

/**
 * Permission helpers for the UI. The backend is always the source of truth
 * (every endpoint enforces RBAC); this hook only hides/disables controls the
 * user cannot use.
 */
export function usePermissions() {
  const { user, isAdmin, isLoading: userLoading } = useCurrentUser();
  const { allNodes, isLoading: nodesLoading } = useNodesContext();

  const canNode = useCallback(
    (nodeId: string | undefined | null, perm: string): boolean => {
      if (isAdmin) return true;
      if (!nodeId) return false;
      const node = allNodes.find((n) => n.id === nodeId);
      // Unknown yet (still loading) → optimistic, the API will reject if needed.
      if (!node) return userLoading || nodesLoading;
      // Older APIs without RBAC don't send permissions → owner semantics.
      if (!node.permissions) return true;
      return hasPermission(node.permissions, perm);
    },
    [isAdmin, allNodes, userLoading, nodesLoading]
  );

  return { user, isAdmin, isLoading: userLoading || nodesLoading, canNode };
}

/** Convenience hook scoped to a single node. */
export function useNodePermissions(nodeId: string | undefined | null) {
  const { canNode, isAdmin, isLoading } = usePermissions();
  const can = useCallback((perm: string) => canNode(nodeId, perm), [canNode, nodeId]);
  return { can, isAdmin, isLoading };
}
