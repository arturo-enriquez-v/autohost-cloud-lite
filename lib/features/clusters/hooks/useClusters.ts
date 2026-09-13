"use client";

import { useState, useEffect, useCallback } from "react";
import type { ClusterWithDetails, AutoscalePolicy } from "@/lib/types/cluster";

export function useClusters() {
  const [clusters, setClusters] = useState<ClusterWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClusters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clusters");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch clusters");
      }
      const data = await res.json();
      setClusters(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  const createCluster = async (name: string, managerNodeID: string, workerNodeIDs: string[]) => {
    const res = await fetch("/api/clusters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        manager_node_id: managerNodeID,
        worker_node_ids: workerNodeIDs,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create cluster");
    }
    const created = await res.json();
    await fetchClusters();
    return created;
  };

  const deleteCluster = async (clusterId: string) => {
    const res = await fetch(`/api/clusters/${clusterId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to delete cluster");
    }
    await fetchClusters();
  };

  const createService = async (
    clusterId: string,
    spec: { name: string; image: string; ports: string; env_vars: Record<string, string>; replicas: number }
  ) => {
    const res = await fetch(`/api/clusters/${clusterId}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(spec),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create service");
    }
    const created = await res.json();
    await fetchClusters();
    return created;
  };

  const scaleService = async (clusterId: string, serviceId: string, replicas: number) => {
    const res = await fetch(`/api/clusters/${clusterId}/services/${serviceId}/scale`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replicas }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to scale service");
    }
    await fetchClusters();
  };

  const deleteService = async (clusterId: string, serviceId: string) => {
    const res = await fetch(`/api/clusters/${clusterId}/services/${serviceId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to delete service");
    }
    await fetchClusters();
  };

  const configureAutoscaling = async (
    clusterId: string,
    serviceId: string,
    policy: AutoscalePolicy
  ) => {
    const res = await fetch(`/api/clusters/${clusterId}/services/${serviceId}/autoscaling`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(policy),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to configure autoscaling");
    }
    const updated = await res.json();
    await fetchClusters();
    return updated;
  };

  return {
    clusters,
    loading,
    error,
    refresh: fetchClusters,
    createCluster,
    deleteCluster,
    createService,
    scaleService,
    deleteService,
    configureAutoscaling,
  };
}
