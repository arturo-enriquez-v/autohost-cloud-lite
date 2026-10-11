"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { VirtualMachine, CreateVMRequest, HypervisorResponse } from "../types";
import { fetchHypervisorInfo, fetchNodeVMs, createVM, actionVM, deleteVM } from "../api";

export function useVirtualMachines(nodeId: string) {
  const [hypervisor, setHypervisor] = useState<HypervisorResponse | null>(null);
  const [vms, setVms] = useState<VirtualMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAll = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const [hypData, vmData] = await Promise.all([
        fetchHypervisorInfo(nodeId).catch(() => null),
        fetchNodeVMs(nodeId).catch(() => []),
      ]);

      if (hypData) setHypervisor(hypData);
      setVms(vmData);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching VMs");
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchAll(true);

    // Poll every 8 seconds if there are VMs provisioning
    pollingRef.current = setInterval(() => {
      fetchAll(false);
    }, 8000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchAll]);

  const handleCreate = useCallback(
    async (payload: CreateVMRequest) => {
      const created = await createVM(nodeId, payload);
      setVms((prev) => [created, ...prev]);
      // Trigger a rapid refresh after 2 seconds
      setTimeout(() => fetchAll(false), 2000);
      return created;
    },
    [nodeId, fetchAll]
  );

  const handleAction = useCallback(
    async (vmId: string, action: "start" | "stop" | "reboot" | "destroy") => {
      await actionVM(vmId, action);
      if (action === "destroy") {
        setVms((prev) => prev.filter((v) => v.id !== vmId));
      } else {
        setVms((prev) =>
          prev.map((v) => {
            if (v.id === vmId) {
              return {
                ...v,
                status: action === "start" ? "running" : action === "stop" ? "stopped" : v.status,
              };
            }
            return v;
          })
        );
      }
      setTimeout(() => fetchAll(false), 2000);
    },
    [fetchAll]
  );

  const handleDelete = useCallback(
    async (vmId: string) => {
      await deleteVM(vmId);
      setVms((prev) => prev.filter((v) => v.id !== vmId));
      setTimeout(() => fetchAll(false), 1500);
    },
    [fetchAll]
  );

  return {
    hypervisor,
    vms,
    isLoading,
    error,
    refresh: () => fetchAll(false),
    createVM: handleCreate,
    actionVM: handleAction,
    deleteVM: handleDelete,
  };
}
