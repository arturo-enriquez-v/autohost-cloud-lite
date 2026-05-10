"use client";

import { useCallback, useEffect, useState } from "react";
import type { Node } from "@/lib/types";
import { NodesService } from "@/lib/features/nodes/nodes/services/nodes.service";
import { MarketplaceService } from "../services/marketplace.service";
import type { AppCatalogEntry, DeployAppResponse, MarketplaceApp } from "../interfaces/marketplace";

export function useMarketplace() {
    const [apps, setApps] = useState<AppCatalogEntry[]>([]);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [installed, setInstalled] = useState<MarketplaceApp[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedApp, setSelectedApp] = useState<AppCatalogEntry | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [appsData, nodesData] = await Promise.all([
                MarketplaceService.getApps() as Promise<AppCatalogEntry[]>,
                NodesService.getNodesWithMetrics(),
            ]);

            setApps(appsData);
            setNodes(nodesData);

            const allInstalled: MarketplaceApp[] = [];
            await Promise.all(
                nodesData.map(async (node) => {
                    try {
                        const data: MarketplaceApp[] = await MarketplaceService.getAppsByNode(node.id);
                        allInstalled.push(...data);
                    } catch {
                        // ignore per-node errors
                    }
                })
            );
            setInstalled(allInstalled);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unexpected error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const deploy = useCallback(
        async (nodeId: string, appName: string, envVars: Record<string, string>): Promise<DeployAppResponse> => {
            return MarketplaceService.deployApp(nodeId, appName, envVars);
        },
        [],
    );

    function handleDeploySuccess() {
        setSelectedApp(null);
        setSuccessMsg("App deployment started! Check the job status for updates.");
        load();
        setTimeout(() => setSuccessMsg(null), 5000);
    }

    useEffect(() => {
        load();
    }, [load]);

    return {
        apps,
        nodes,
        installed,
        isLoading,
        error,
        selectedApp,
        setSelectedApp,
        successMsg,
        load,
        deploy,
        handleDeploySuccess,
    };
}