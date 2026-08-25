"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import type { BackupConfig, BackupRecord } from "@/lib/api/backups";
import { parseCron, buildCron } from "../utils";

const EMPTY_VOLUMES: string[] = [];

interface UseContainerBackupsOptions {
  nodeId: string;
  containerName: string;
  detectedVolumes?: string[];
}

export function useContainerBackups({
  nodeId,
  containerName,
  detectedVolumes = EMPTY_VOLUMES,
}: UseContainerBackupsOptions) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);

  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [records, setRecords] = useState<BackupRecord[]>([]);

  // Sub-tabs state for History vs Snapshots
  const [historyTab, setHistoryTab] = useState<"snapshots" | "activity">("snapshots");

  // Form State
  const [enabled, setEnabled] = useState(false);
  const [cronExpr, setCronExpr] = useState("0 3 * * *");
  const [freqInterval, setFreqInterval] = useState<"daily" | "weekly" | "monthly">("daily");
  const [freqTime, setFreqTime] = useState("03:00");
  const [freqDayOfWeek, setFreqDayOfWeek] = useState("0");
  const [freqDayOfMonth, setFreqDayOfMonth] = useState("1");

  const [retention, setRetention] = useState(7);
  const [pauseContainer, setPauseContainer] = useState(true);
  const [selectedVolumes, setSelectedVolumes] = useState<string[]>([]);
  const [backupMethod, setBackupMethod] = useState<"volume" | "pg_dump">("volume");
  const [pgUser, setPgUser] = useState("postgres");

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BackupRecord | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirmInput, setRestoreConfirmInput] = useState("");
  const [restoreStatusMsg, setRestoreStatusMsg] = useState("");

  const volumesRef = useRef(detectedVolumes);
  useEffect(() => {
    volumesRef.current = detectedVolumes;
  }, [detectedVolumes]);

  const completedSnapshots = useMemo(
    () =>
      records.filter(
        (r) =>
          r.trigger_type !== "restore" &&
          r.trigger_type !== "download" &&
          r.status === "completed"
      ),
    [records]
  );

  // Check if inner configuration fields have unsaved modifications
  const hasChanges = useMemo(() => {
    const defaultVols = volumesRef.current;
    if (!config) {
      return (
        cronExpr !== "0 3 * * *" ||
        retention !== 7 ||
        pauseContainer !== true ||
        backupMethod !== "volume" ||
        pgUser !== "postgres"
      );
    }
    const cronChanged = (config.cron_expression || "0 3 * * *") !== cronExpr;
    const retentionChanged = (config.retention_count || 7) !== Number(retention);
    const pauseChanged = (config.pause_container ?? true) !== pauseContainer;
    const methodChanged = (config.backup_method || "volume") !== backupMethod;
    const pgUserChanged = (config.pg_user || "postgres") !== pgUser;

    const configVols = Array.isArray(config.volumes) ? config.volumes : defaultVols;
    const volsChanged =
      configVols.length !== selectedVolumes.length ||
      !configVols.every((v: string) => selectedVolumes.includes(v));

    return (
      cronChanged ||
      retentionChanged ||
      pauseChanged ||
      volsChanged ||
      methodChanged ||
      pgUserChanged
    );
  }, [
    config,
    cronExpr,
    retention,
    pauseContainer,
    backupMethod,
    pgUser,
    selectedVolumes,
  ]);

  const loadRecords = useCallback(async () => {
    if (!nodeId || !containerName) return;
    try {
      const res = await fetch(`/api/backups/records/${nodeId}/${containerName}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecords(data);
        }
      }
    } catch (err) {
      console.error("Error refreshing backup records:", err);
    }
  }, [nodeId, containerName]);

  const loadData = useCallback(
    async (isInitial = false) => {
      if (!nodeId || !containerName) return;
      if (isInitial) setLoading(true);
      try {
        const [cfgRes, recsRes] = await Promise.all([
          fetch(`/api/backups/config/${nodeId}/${containerName}`).then((r) =>
            r.ok ? r.json() : null
          ),
          fetch(`/api/backups/records/${nodeId}/${containerName}`).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);

        if (Array.isArray(recsRes)) {
          setRecords(recsRes);
        }

        const currentVolumes = volumesRef.current;
        if (cfgRes && cfgRes.id) {
          setConfig(cfgRes);
          setEnabled(cfgRes.enabled ?? false);
          const expr = cfgRes.cron_expression || "0 3 * * *";
          setCronExpr(expr);
          const parsed = parseCron(expr);
          setFreqInterval(parsed.interval);
          setFreqTime(parsed.time);
          setFreqDayOfWeek(parsed.dayOfWeek);
          setFreqDayOfMonth(parsed.dayOfMonth);

          setRetention(cfgRes.retention_count || 7);
          setPauseContainer(cfgRes.pause_container ?? true);
          setBackupMethod((cfgRes.backup_method as "volume" | "pg_dump") || "volume");
          setPgUser(cfgRes.pg_user || "postgres");
          if (Array.isArray(cfgRes.volumes) && cfgRes.volumes.length > 0) {
            setSelectedVolumes(cfgRes.volumes);
          } else {
            setSelectedVolumes(currentVolumes);
          }
        } else {
          setSelectedVolumes(currentVolumes);
        }
      } catch (err) {
        console.error("Error loading backup tab data:", err);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [nodeId, containerName]
  );

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Auto-refresh every 3s ONLY while any backup is actively in 'running' status
  const hasRunning = records.some((r) => r.status === "running");
  useEffect(() => {
    if (!hasRunning) return;

    const interval = setInterval(() => {
      loadRecords();
    }, 3000);

    return () => clearInterval(interval);
  }, [hasRunning, loadRecords]);

  const handleScheduleChange = (
    interval: "daily" | "weekly" | "monthly",
    time: string,
    dow: string,
    dom: string
  ) => {
    setFreqInterval(interval);
    setFreqTime(time);
    setFreqDayOfWeek(dow);
    setFreqDayOfMonth(dom);
    const newCron = buildCron(interval, time, dow, dom);
    setCronExpr(newCron);
  };

  const toggleVolume = (vol: string) => {
    setSelectedVolumes((prev) =>
      prev.includes(vol) ? prev.filter((v) => v !== vol) : [...prev, vol]
    );
  };

  const handleToggleEnabled = async () => {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    try {
      const res = await fetch(`/api/backups/config/${nodeId}/${containerName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: nextEnabled,
          volumes: selectedVolumes,
          cron_expression: cronExpr,
          retention_count: Number(retention),
          pause_container: pauseContainer,
          backup_method: backupMethod,
          pg_user: pgUser,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        toast.success(
          nextEnabled
            ? "Automated backups enabled."
            : "Automated backups paused."
        );
      } else {
        setEnabled(!nextEnabled);
        toast.error("Failed to update backup status.");
      }
    } catch {
      setEnabled(!nextEnabled);
      toast.error("Network error updating status.");
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/backups/config/${nodeId}/${containerName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          volumes: selectedVolumes,
          cron_expression: cronExpr,
          retention_count: Number(retention),
          pause_container: pauseContainer,
          backup_method: backupMethod,
          pg_user: pgUser,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        toast.success("Backup configuration saved successfully.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save backup configuration.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to API.");
    } finally {
      setSaving(false);
    }
  };

  const handleRunManualBackup = async () => {
    setRunningBackup(true);
    try {
      const res = await fetch(`/api/backups/run/${nodeId}/${containerName}`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Manual backup initiated successfully.");
        loadRecords();
      } else {
        const err = await res.json();
        toast.error(`Error starting backup: ${err.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error sending request.");
    } finally {
      setRunningBackup(false);
    }
  };

  const handleOpenRestoreModal = (rec: BackupRecord) => {
    setSelectedRecord(rec);
    setRestoreConfirmInput("");
    setRestoreStatusMsg("");
    setRestoreModalOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (!selectedRecord) return;
    if (restoreConfirmInput !== containerName) {
      toast.warning(`Please type "${containerName}" exactly to confirm.`);
      return;
    }

    setRestoring(true);
    setRestoreStatusMsg("Stopping container and restoring volumes from storage...");
    try {
      const res = await fetch(`/api/backups/restore/${selectedRecord.id}`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Volume restoration initiated successfully.");
        setRestoreModalOpen(false);
        loadRecords();
      } else {
        const err = await res.json();
        setRestoreStatusMsg(`❌ Restoration error: ${err.error || "Failed"}`);
      }
    } catch {
      setRestoreStatusMsg("❌ Network error connecting to API.");
    } finally {
      setRestoring(false);
    }
  };

  const handleDownload = async (recordId: string) => {
    try {
      const res = await fetch(`/api/backups/download/${recordId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.download_url) {
          const a = document.createElement("a");
          a.href = data.download_url;
          a.download = data.filename || "backup.tar.gz";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success("Download started.");
          loadRecords();
        } else {
          toast.error("Download URL not found.");
        }
      } else {
        const err = await res.json();
        toast.error(`Download failed: ${err.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect for download.");
    }
  };

  return {
    loading,
    saving,
    runningBackup,
    config,
    records,
    completedSnapshots,
    enabled,
    cronExpr,
    freqInterval,
    freqTime,
    freqDayOfWeek,
    freqDayOfMonth,
    retention,
    pauseContainer,
    selectedVolumes,
    backupMethod,
    pgUser,
    hasChanges,
    historyTab,
    restoreModalOpen,
    selectedRecord,
    restoring,
    restoreConfirmInput,
    restoreStatusMsg,
    setHistoryTab,
    setRetention,
    setPauseContainer,
    setBackupMethod,
    setPgUser,
    setRestoreModalOpen,
    setRestoreConfirmInput,
    handleScheduleChange,
    toggleVolume,
    handleToggleEnabled,
    handleSaveConfig,
    handleRunManualBackup,
    handleOpenRestoreModal,
    handleConfirmRestore,
    handleDownload,
  };
}
