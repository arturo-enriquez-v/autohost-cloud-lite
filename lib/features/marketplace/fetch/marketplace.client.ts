import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_MARKETPLACE_ENDPOINTS } from "./constants";


export async function fetchgetApps(): Promise<Response> {
    return fetchWithAuth(CLIENT_API_MARKETPLACE_ENDPOINTS.MARKETPLACE.APPS, { method: "GET" });
}

export async function fetchDeployApp(
    nodeId: string,
    appName: string,
    envVars: Record<string, string>,
): Promise<Response> {
    return fetchWithAuth(CLIENT_API_MARKETPLACE_ENDPOINTS.MARKETPLACE.DEPLOY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: nodeId, app_name: appName, env_vars: envVars }),
    });
}

export async function fetchAppsByNode(nodeId: string): Promise<Response> {
    return fetchWithAuth(CLIENT_API_MARKETPLACE_ENDPOINTS.MARKETPLACE.BY_NODE(nodeId), { method: "GET" });
}