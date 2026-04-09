"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api/fetch-client";
import type { NodeAlertConfig } from "@/lib/types";

const EMPTY_CONFIG: NodeAlertConfig = {
  nodeId: "",
  telegramBotToken: "",
  telegramChatId: "",
  cpuThreshold: null,
  ramThreshold: null,
  diskThreshold: null,
  alertOnOffline: false,
};

export function useNodeAlerts(nodeId: string) {
  const [config, setConfig] = useState<NodeAlertConfig>({ ...EMPTY_CONFIG, nodeId });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/nodes/${nodeId}/alerts`);
      if (!res.ok) throw new Error("Failed to fetch alert config");
      const data: NodeAlertConfig = await res.json();
      setConfig(data);
      setError(null);
    } catch (err) {
      // If not found, keep the empty config — that's fine
      setConfig({ ...EMPTY_CONFIG, nodeId });
    } finally {
      setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const save = useCallback(
    async (data: Omit<NodeAlertConfig, "id" | "nodeId" | "createdAt" | "updatedAt">) => {
      setIsSaving(true);
      setSaved(false);
      try {
        const res = await fetchWithAuth(`/api/nodes/${nodeId}/alerts`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to save alert config");
        }
        const updated: NodeAlertConfig = await res.json();
        setConfig(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [nodeId]
  );

  return { config, isLoading, isSaving, saved, error, save };
}
