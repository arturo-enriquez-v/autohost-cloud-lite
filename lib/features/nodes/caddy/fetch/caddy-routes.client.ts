import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_CADDY_ENDPOINTS } from "./constants";

export async function fetchCaddyRoutes(nodeId: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_CADDY_ENDPOINTS.CADDY_ROUTES.BY_NODE(nodeId), {
    method: "GET",
  });
}

export async function fetchUpsertCaddyRoute(
  nodeId: string,
  domain: string,
  upstream: string
): Promise<Response> {
  return fetchWithAuth(CLIENT_API_CADDY_ENDPOINTS.CADDY_ROUTES.BY_NODE(nodeId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, upstream }),
  });
}

export async function fetchDeleteCaddyRoute(
  nodeId: string,
  domain: string
): Promise<Response> {
  return fetchWithAuth(CLIENT_API_CADDY_ENDPOINTS.CADDY_ROUTES.DELETE(nodeId, domain), {
    method: "DELETE",
  });
}
