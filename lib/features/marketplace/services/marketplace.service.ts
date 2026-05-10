import { fetchAppsByNode, fetchDeployApp, fetchgetApps } from "../fetch/marketplace.client";


export const MarketplaceService = { 
    
    async getApps() { 
        const res = await fetchgetApps();
        if (!res.ok) throw new Error("Failed to load marketplace apps");
        return res.json();
    },

    async deployApp(nodeId: string, appName: string, envVars: Record<string, string>) {
        const res = await fetchDeployApp(nodeId, appName, envVars);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Failed to deploy app" }));
            throw new Error(err.error ?? "Failed to deploy app");
        }
        return res.json();
    },

    async getAppsByNode(nodeId: string) {
        const res = await fetchAppsByNode(nodeId);
        if (!res.ok) throw new Error("Failed to load apps by node");
        return res.json();
    }
}; 