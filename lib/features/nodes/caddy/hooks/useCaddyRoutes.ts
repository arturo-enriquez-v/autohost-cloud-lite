"use client";

import { useState, useEffect, useCallback } from "react";
import type { CaddyRoute, CaddyTLSMode } from "../interfaces/caddy";
import { CaddyService } from "../services/caddy.service";

export function useCaddyRoutes(nodeId: string) {
  const [routes, setRoutes] = useState<CaddyRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await CaddyService.getRoutes(nodeId);
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
    async (domain: string, upstream: string, tlsMode: CaddyTLSMode = "auto") => {
      const saved = await CaddyService.upsertRoute(nodeId, domain, upstream, tlsMode);
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
      await CaddyService.deleteRoute(nodeId, domain);
      setRoutes((prev) => prev.filter((r) => r.domain !== domain));
    },
    [nodeId]
  );

  return { routes, isLoading, error, upsert, remove, refresh: fetchRoutes };
}
