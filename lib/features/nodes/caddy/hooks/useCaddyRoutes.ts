"use client";

import { useState, useEffect, useCallback } from "react";
import type { CaddyRoute } from "../../types";
import { fetchCaddyRoutes, upsertCaddyRoute as apiUpsert, deleteCaddyRoute as apiDelete } from "../../api";

export function useCaddyRoutes(nodeId: string) {
  const [routes, setRoutes] = useState<CaddyRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchCaddyRoutes(nodeId);
      setRoutes(data);
      setError(null);
    } catch {
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const upsert = useCallback(
    async (domain: string, upstream: string) => {
      const saved = await apiUpsert(nodeId, domain, upstream);
      setRoutes((prev) => {
        const idx = prev.findIndex((r) => r.domain === saved.domain);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      return saved;
    },
    [nodeId]
  );

  const remove = useCallback(
    async (domain: string) => {
      await apiDelete(nodeId, domain);
      setRoutes((prev) => prev.filter((r) => r.domain !== domain));
    },
    [nodeId]
  );

  return { routes, isLoading, error, upsert, remove, refresh: fetchRoutes };
}
