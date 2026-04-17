import { API_ENDPOINTS } from "@/config/constants";
import { backendFetch } from "../api";

export async function getMarketplaceAppsBackend(accessToken: string) {
  return backendFetch(API_ENDPOINTS.MARKETPLACE.APPS, { method: "GET" }, accessToken);
}

export async function deployMarketplaceAppBackend(
  nodeId: string,
  appName: string,
  envVars: Record<string, string>,
  accessToken: string
) {
  return backendFetch(
    API_ENDPOINTS.MARKETPLACE.DEPLOY,
    {
      method: "POST",
      body: JSON.stringify({ node_id: nodeId, app_name: appName, env_vars: envVars }),
    },
    accessToken
  );
}

export async function getNodeMarketplaceAppsBackend(nodeId: string, accessToken: string) {
  return backendFetch(
    API_ENDPOINTS.MARKETPLACE.BY_NODE(nodeId),
    { method: "GET" },
    accessToken
  );
}
