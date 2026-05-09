"use client";

import { useState, useEffect, useCallback } from "react";
import type { NodeAlertConfig } from "../../types";
import { fetchNodeAlertConfig, saveNodeAlertConfig as apiSaveNodeAlertConfig } from "../../api";

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
      const data = await fetchNodeAlertConfig(nodeId);
      setConfig(data ?? { ...EMPTY_CONFIG, nodeId });
      setError(null);
    } catch {
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
        const updated = await apiSaveNodeAlertConfig(nodeId, data);
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
