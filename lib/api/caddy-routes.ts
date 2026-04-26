import { API_ENDPOINTS } from "@/config/constants";
import type { CaddyRoute, CaddyRouteBackendResponse } from "@/lib/types";
import { backendFetch } from "../api";

export async function listCaddyRoutesBackend(nodeId: string, accessToken: string) {
  return backendFetch(API_ENDPOINTS.CADDY_ROUTES.BY_NODE(nodeId), { method: "GET" }, accessToken);
}

export async function upsertCaddyRouteBackend(
  nodeId: string,
  data: { domain: string; upstream: string },
  accessToken: string
) {
  return backendFetch(
    API_ENDPOINTS.CADDY_ROUTES.BY_NODE(nodeId),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    accessToken
  );
}

export async function deleteCaddyRouteBackend(
  nodeId: string,
  domain: string,
  accessToken: string
) {
  return backendFetch(
    API_ENDPOINTS.CADDY_ROUTES.DELETE(nodeId, domain),
    { method: "DELETE" },
    accessToken
  );
}

export function mapCaddyRouteFromBackend(r: CaddyRouteBackendResponse): CaddyRoute {
  return {
    id: r.id,
    nodeId: r.node_id,
    userId: r.user_id,
    domain: r.domain,
    upstream: r.upstream,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
