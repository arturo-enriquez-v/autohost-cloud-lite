"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Database, 
  Play, 
  RotateCcw, 
  Trash2, 
  HardDrive, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Plus,
  Cloud,
  FileArchive,
  Download,
  User,
  Bot,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { BackupConfig, BackupRecord } from "@/lib/api/backups";

interface Props {
  nodeId: string;
  containerName: string;
  detectedVolumes?: string[];
}

function parseCron(cron: string) {
  const parts = (cron || "").trim().split(/\s+/);
  if (parts.length < 5) {
    return { interval: "daily" as const, time: "03:00", dayOfWeek: "0", dayOfMonth: "1" };
  }
  const [min, hour, dom, , dow] = parts;
  const mm = (parseInt(min, 10) || 0).toString().padStart(2, "0");
  const hh = (parseInt(hour, 10) || 0).toString().padStart(2, "0");
  const time = `${hh}:${mm}`;

  if (dow !== "*") {
    return { interval: "weekly" as const, time, dayOfWeek: dow, dayOfMonth: "1" };
  }
  if (dom !== "*") {
    return { interval: "monthly" as const, time, dayOfWeek: "0", dayOfMonth: dom };
  }
  return { interval: "daily" as const, time, dayOfWeek: "0", dayOfMonth: "1" };
}

function buildCron(
  interval: "daily" | "weekly" | "monthly",
  time: string,
  dayOfWeek: string,
  dayOfMonth: string
): string {
  const [hhStr, mmStr] = (time || "03:00").split(":");
  const mm = parseInt(mmStr || "0", 10) || 0;
  const hh = parseInt(hhStr || "0", 10) || 0;

  if (interval === "weekly") {
    return `${mm} ${hh} * * ${dayOfWeek}`;
  }
  if (interval === "monthly") {
    return `${mm} ${hh} ${dayOfMonth} * *`;
  }
  return `${mm} ${hh} * * *`;
}

function getScheduleSummary(
  interval: "daily" | "weekly" | "monthly",
  time: string,
  dow: string,
  dom: string
): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[parseInt(dow, 10)] || "Sunday";

  if (interval === "weekly") {
    return `Every ${dayName} at ${time || "03:00"} UTC`;
  }
  if (interval === "monthly") {
    const domNum = parseInt(dom, 10) || 1;
    const suffix = domNum === 1 ? "1st" : domNum === 2 ? "2nd" : domNum === 3 ? "3rd" : `${domNum}th`;
    return `Every ${suffix} of the month at ${time || "03:00"} UTC`;
  }
  return `Every day at ${time || "03:00"} UTC`;
}

function formatSnapshotDateFromKey(s3Key: string): string {
  if (!s3Key) return "";
  const parts = s3Key.split("/");
  for (const part of parts) {
    if (part.includes("_") && part.includes("-")) {
      const subParts = part.split("_");
      if (subParts.length === 2 && subParts[0].length === 10) {
        const dateStr = subParts[0];
        const timeStr = subParts[1];
        if (timeStr.length >= 6) {
          const formattedTime = `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}:${timeStr.substring(4, 6)}`;
          return `${dateStr} ${formattedTime}`;
        }
        return dateStr;
      }
    }
  }
  return s3Key.split("/").pop() || "";
}

export function ContainerBackupsTab({
  nodeId,
  containerName,
  detectedVolumes = [],
}: Props) {
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

  const completedSnapshots = records.filter(
    (r) => r.trigger_type !== "restore" && r.trigger_type !== "download" && r.status === "completed"
  );

  // Check if inner configuration fields have unsaved modifications
  const hasChanges = (() => {
    if (!config) {
      return cronExpr !== "0 3 * * *" || retention !== 7 || pauseContainer !== true || backupMethod !== "volume" || pgUser !== "postgres";
    }
    const cronChanged = (config.cron_expression || "0 3 * * *") !== cronExpr;
    const retentionChanged = (config.retention_count || 7) !== Number(retention);
    const pauseChanged = (config.pause_container ?? true) !== pauseContainer;
    const methodChanged = (config.backup_method || "volume") !== backupMethod;
    const pgUserChanged = (config.pg_user || "postgres") !== pgUser;
    
    const configVols = Array.isArray(config.volumes) ? config.volumes : detectedVolumes;
    const volsChanged =
      configVols.length !== selectedVolumes.length ||
      !configVols.every((v: string) => selectedVolumes.includes(v));

    return cronChanged || retentionChanged || pauseChanged || volsChanged || methodChanged || pgUserChanged;
  })();

  useEffect(() => {
    loadData(true);
  }, [nodeId, containerName]);

  // Auto-refresh every 2s while any backup is in 'running' status
  useEffect(() => {
    const hasRunning = records.some((r) => r.status === "running");
    if (!hasRunning) return;

    const interval = setInterval(() => {
      loadData(false);
    }, 2000);

    return () => clearInterval(interval);
  }, [records, nodeId, containerName]);

  async function loadData(isInitial = false) {
    if (isInitial) setLoading(true);
    try {
      const [cfgRes, recsRes] = await Promise.all([
        fetch(`/api/backups/config/${nodeId}/${containerName}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/backups/records/${nodeId}/${containerName}`).then((r) => (r.ok ? r.json() : [])),
      ]);

      if (Array.isArray(recsRes)) {
        setRecords(recsRes);
      }

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
        if (Array.isArray(cfgRes.volumes)) {
          setSelectedVolumes(cfgRes.volumes);
        } else {
          setSelectedVolumes(detectedVolumes);
        }
      } else {
        setSelectedVolumes(detectedVolumes);
      }
    } catch (err) {
      console.error("Error loading backup tab data:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }

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
        toast.success(nextEnabled ? "Automatic backups enabled." : "Automatic backups disabled.");
      } else {
        setEnabled(!nextEnabled);
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update backup status.");
      }
    } catch (err) {
      setEnabled(!nextEnabled);
      console.error(err);
      toast.error("Error connecting to API.");
    }
  };

  const toggleVolume = (vol: string) => {
    if (selectedVolumes.includes(vol)) {
      setSelectedVolumes(selectedVolumes.filter((v) => v !== vol));
    } else {
      setSelectedVolumes([...selectedVolumes, vol]);
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
        loadData(false);
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
        loadData(false);
      } else {
        const err = await res.json();
        setRestoreStatusMsg(`❌ Restoration error: ${err.error || "Failed"}`);
      }
    } catch (err) {
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
          loadData(false);
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

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin" /> Loading backup module...
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* HEADER / TOGGLE CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Container Backups
            </h3>
            <p className="text-sm text-slate-400">
              Automatically store or restore backups of container data via volume archives or PostgreSQL dumps.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
          <span className="text-sm font-medium text-slate-300">Automatic Backups:</span>
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? "bg-emerald-600" : "bg-slate-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* CONFIGURATION PANEL */}
      <div className={`bg-slate-900 border rounded-xl p-6 space-y-6 transition-all duration-300 ${
        enabled ? "border-slate-800 opacity-100" : "border-slate-800/60 opacity-60"
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-md font-semibold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" /> Configuration & Schedule
          </h4>
          {!enabled && (
            <span className="text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 font-medium">
              Automated Schedule Inactive
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage, Method & Retention */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Storage Destination
              </label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
                <Cloud className="w-4 h-4 text-blue-400" />
                <span>AutoHost Cloud Storage (Included)</span>
              </div>
            </div>

            {/* Backup Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Backup Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBackupMethod("volume")}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                    backupMethod === "volume"
                      ? "bg-blue-600/10 border-blue-500/50 text-blue-300 shadow-sm shadow-blue-500/10"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                  <div className="text-left">
                    <div>Volume Archive</div>
                    <div className="text-[10px] opacity-70 font-normal">Raw .tar.gz of volumes</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setBackupMethod("pg_dump")}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                    backupMethod === "pg_dump"
                      ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/10"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <div className="text-left">
                    <div>PostgreSQL Dump</div>
                    <div className="text-[10px] opacity-70 font-normal">Logical SQL dump</div>
                  </div>
                </button>
              </div>
              {backupMethod === "pg_dump" && (
                <div className="mt-3 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300/80">
                  💡 Uses <code className="bg-emerald-500/10 px-1 rounded">pg_dumpall</code> for a portable, version-safe logical backup.
                </div>
              )}
            </div>

            {/* PostgreSQL User (only shown for pg_dump) */}
            {backupMethod === "pg_dump" && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  PostgreSQL User
                </label>
                <input
                  type="text"
                  value={pgUser}
                  onChange={(e) => setPgUser(e.target.value)}
                  placeholder="postgres"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Retention (Copies to keep)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={retention}
                onChange={(e) => setRetention(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Pause container checkbox (only for volume method) */}
            {backupMethod === "volume" && (
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="pauseCheck"
                  checked={pauseContainer}
                  onChange={(e) => setPauseContainer(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                />
                <label htmlFor="pauseCheck" className="text-sm text-slate-300">
                  Pause container during archiving (Recommended for DBs)
                </label>
              </div>
            )}
          </div>

          {/* Backup Schedule Builder */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Backup Schedule
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Interval Selection */}
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">Frequency</span>
                <select
                  value={freqInterval}
                  onChange={(e) =>
                    handleScheduleChange(
                      e.target.value as "daily" | "weekly" | "monthly",
                      freqTime,
                      freqDayOfWeek,
                      freqDayOfMonth
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Day Selection (if weekly or monthly) */}
              {freqInterval === "weekly" && (
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">Day of Week</span>
                  <select
                    value={freqDayOfWeek}
                    onChange={(e) =>
                      handleScheduleChange(freqInterval, freqTime, e.target.value, freqDayOfMonth)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
              )}

              {freqInterval === "monthly" && (
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">Day of Month</span>
                  <select
                    value={freqDayOfMonth}
                    onChange={(e) =>
                      handleScheduleChange(freqInterval, freqTime, freqDayOfWeek, e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>
                        {d === 1 ? "1st" : d === 2 ? "2nd" : d === 3 ? "3rd" : `${d}th`} of the month
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time Picker (UTC) */}
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">Time (UTC)</span>
                <input
                  type="time"
                  value={freqTime}
                  onChange={(e) =>
                    handleScheduleChange(
                      freqInterval,
                      e.target.value,
                      freqDayOfWeek,
                      freqDayOfMonth
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Schedule Preview Badge */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">{getScheduleSummary(freqInterval, freqTime, freqDayOfWeek, freqDayOfMonth)}</span>
              <span className="ml-auto font-mono text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                {cronExpr}
              </span>
            </div>
          </div>
        </div>

        {/* Volume Selection Checkboxes */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Volumes Included in Backup
          </label>
          {detectedVolumes.length === 0 ? (
            <div className="text-sm text-slate-500 italic">
              All named volumes and mounts will be archived automatically.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {detectedVolumes.map((vol) => (
                <label
                  key={vol}
                  className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedVolumes.includes(vol)}
                    onChange={() => toggleVolume(vol)}
                    className="w-4 h-4 rounded border-slate-800 text-blue-600 focus:ring-0"
                  />
                  <span className="text-sm text-slate-200 font-mono text-xs">{vol}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={!hasChanges || saving}
              className={`font-medium text-sm px-5 py-2 rounded-lg transition-all duration-200 ${
                hasChanges && !saving
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 cursor-pointer"
                  : "bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/40"
              }`}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
            {hasChanges && (
              <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                ● Unsaved changes
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleRunManualBackup}
            disabled={runningBackup}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            {runningBackup ? "Executing..." : "⚡ Create Manual Backup Now"}
          </button>
        </div>
      </div>

      {/* SUB-TABS: AVAILABLE SNAPSHOTS vs ACTIVITY LOG */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryTab("snapshots")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                historyTab === "snapshots"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <FileArchive className="w-4 h-4 text-blue-300" />
              <span>Available Snapshots ({completedSnapshots.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setHistoryTab("activity")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                historyTab === "activity"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Clock className="w-4 h-4 text-blue-300" />
              <span>Activity & Audit Log ({records.length})</span>
            </button>
          </div>

          <span className="text-xs text-slate-400">
            {historyTab === "snapshots"
              ? "Restorable backup archives"
              : "Linear chronological activity trail"}
          </span>
        </div>

        {historyTab === "snapshots" ? (
          /* AVAILABLE SNAPSHOTS TAB */
          completedSnapshots.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No completed backup snapshots available for restore yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Creation Date</th>
                    <th className="py-3 px-4">Archive Name</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {completedSnapshots.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono text-xs text-slate-300">
                        {new Date(r.started_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded w-fit text-slate-300">
                          <FileArchive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{r.s3_key ? r.s3_key.split("/").pop() : `${containerName}.tar.gz`}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        {r.file_size_bytes ? `${(r.file_size_bytes / (1024 * 1024)).toFixed(2)} MB` : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                              r.trigger_type === "manual"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {r.trigger_type === "manual" ? "Manual" : "Scheduled"}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              r.backup_method === "pg_dump"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {r.backup_method === "pg_dump" ? "SQL" : "VOL"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(r.id)}
                            className="inline-flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded transition border border-slate-700 hover:border-blue-500/50"
                            title="Download Backup Archive"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-400" /> Download
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenRestoreModal(r)}
                            className="inline-flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded transition border border-slate-700 hover:border-amber-500/50"
                            title="Restore Container Volume"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ACTIVITY & AUDIT LOG TAB */
          records.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No activity records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4">Target / Details</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono text-xs text-slate-300">
                        {new Date(r.started_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                            r.trigger_type === "manual"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : r.trigger_type === "restore"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : r.trigger_type === "download"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {r.trigger_type === "restore" && <RotateCcw className="w-3 h-3" />}
                          {r.trigger_type === "download" && <Download className="w-3 h-3" />}
                          {r.trigger_type === "manual"
                            ? "Manual Backup"
                            : r.trigger_type === "restore"
                            ? "Volume Restore"
                            : r.trigger_type === "download"
                            ? "File Download"
                            : "Scheduled Backup"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {r.trigger_type === "scheduled" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 font-medium">
                            <Bot className="w-3.5 h-3.5 text-slate-400" /> System Automated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20 font-medium">
                            <User className="w-3.5 h-3.5 text-blue-400" /> {r.user_email || "User"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        {r.trigger_type === "restore" ? (
                          <div className="text-amber-300/90 flex items-center gap-1.5">
                            <span>Restored snapshot from:</span>
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-semibold">
                              {formatSnapshotDateFromKey(r.s3_key)}
                            </span>
                          </div>
                        ) : r.trigger_type === "download" ? (
                          <div className="text-sky-300/90 flex items-center gap-1.5">
                            <span>Downloaded:</span>
                            <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded text-[11px] font-semibold">
                              {r.s3_key ? r.s3_key.split("/").pop() : `${containerName}.tar.gz`}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <FileArchive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{r.s3_key ? r.s3_key.split("/").pop() : `${containerName}.tar.gz`}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {r.status === "completed" && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Successful
                          </span>
                        )}
                        {r.status === "running" && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                            <RefreshCw className="w-4 h-4 animate-spin" /> In Progress
                          </span>
                        )}
                        {r.status === "failed" && (
                          <div className="flex flex-col max-w-sm" title={r.error_message}>
                            <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                              <XCircle className="w-4 h-4 flex-shrink-0" /> Failed
                            </span>
                            {r.error_message && (
                              <span className="text-[11px] text-rose-400/90 font-mono break-words line-clamp-3 mt-0.5">
                                {r.error_message}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* RESTORE CONFIRMATION MODAL */}
      {restoreModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-6 max-w-lg w-full space-y-5">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">⚠️ Confirm Volume Restoration</h3>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              You are about to restore the backup archive from <strong className="text-white">{new Date(selectedRecord.started_at).toLocaleString()}</strong>.
            </p>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 space-y-1">
              <div>• The container <strong>{containerName}</strong> will be temporarily stopped during restoration.</div>
              <div>• Current volume data will be permanently overwritten.</div>
            </div>

            {restoreStatusMsg ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-blue-400">
                {restoreStatusMsg}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Type the container name to confirm (<code>{containerName}</code>):
                </label>
                <input
                  type="text"
                  value={restoreConfirmInput}
                  onChange={(e) => setRestoreConfirmInput(e.target.value)}
                  placeholder={containerName}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                disabled={restoring}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {restoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {restoring ? "Restoring..." : "Confirm Restoration"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
