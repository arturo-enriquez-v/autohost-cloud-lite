"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api/fetch-client";
import type { CaddyRoute } from "@/lib/types";

export function useCaddyRoutes(nodeId: string) {
  const [routes, setRoutes] = useState<CaddyRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/nodes/${nodeId}/caddy-routes`);
      if (!res.ok) throw new Error("Failed to fetch Caddy routes");
      const data: CaddyRoute[] = await res.json();
      setRoutes(data ?? []);
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
      const res = await fetchWithAuth(`/api/nodes/${nodeId}/caddy-routes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, upstream }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save Caddy route");
      }
      const saved: CaddyRoute = await res.json();
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
      const res = await fetchWithAuth(
        `/api/nodes/${nodeId}/caddy-routes/${encodeURIComponent(domain)}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete Caddy route");
      }
      setRoutes((prev) => prev.filter((r) => r.domain !== domain));
    },
    [nodeId]
  );

  return { routes, isLoading, error, upsert, remove, refresh: fetchRoutes };
}
