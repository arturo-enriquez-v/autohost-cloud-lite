import {
  fetchCaddyRoutes,
  fetchUpsertCaddyRoute,
  fetchDeleteCaddyRoute,
} from "../fetch/caddy-routes.client";
import type { CaddyRoute } from "../interfaces/caddy";

export const CaddyService = {
  async getRoutes(nodeId: string): Promise<CaddyRoute[]> {
    const res = await fetchCaddyRoutes(nodeId);
    if (!res.ok) throw new Error("Failed to fetch caddy routes");
    const data: CaddyRoute[] = await res.json();
    return data ?? [];
  },

  async upsertRoute(nodeId: string, domain: string, upstream: string): Promise<CaddyRoute> {
    const res = await fetchUpsertCaddyRoute(nodeId, domain, upstream);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Failed to save route");
    }
    return res.json();
  },

  async deleteRoute(nodeId: string, domain: string): Promise<void> {
    const res = await fetchDeleteCaddyRoute(nodeId, domain);
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Failed to delete route");
    }
  },
};
