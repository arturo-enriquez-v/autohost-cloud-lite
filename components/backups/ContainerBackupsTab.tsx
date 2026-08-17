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
  Cloud
} from "lucide-react";
import { toast } from "sonner";
import { BackupConfig, BackupRecord } from "@/lib/api/backups";

interface Props {
  nodeId: string;
  containerName: string;
  detectedVolumes?: string[];
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

  // Form State
  const [enabled, setEnabled] = useState(false);
  const [cronExpr, setCronExpr] = useState("0 3 * * *");
  const [retention, setRetention] = useState(7);
  const [pauseContainer, setPauseContainer] = useState(true);
  const [selectedVolumes, setSelectedVolumes] = useState<string[]>([]);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BackupRecord | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirmInput, setRestoreConfirmInput] = useState("");
  const [restoreStatusMsg, setRestoreStatusMsg] = useState("");

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
        setCronExpr(cfgRes.cron_expression || "0 3 * * *");
        setRetention(cfgRes.retention_count || 7);
        setPauseContainer(cfgRes.pause_container ?? true);
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
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        toast.success("Backup configuration saved successfully.");
      } else {
        toast.error("Failed to save backup configuration.");
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
              Volume Backups
            </h3>
            <p className="text-sm text-slate-400">
              Automatically store or restore compressed <code>.tar.gz</code> archives of container volumes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
          <span className="text-sm font-medium text-slate-300">Automatic Backups:</span>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <h4 className="text-md font-semibold text-white flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-400" /> Configuration & Schedule
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage Managed Badge */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Storage Destination
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
              <Cloud className="w-4 h-4 text-blue-400" />
              <span>AutoHost Cloud Storage (Included)</span>
            </div>
          </div>

          {/* Cron / Frequency */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Frequency (Cron Expression)
            </label>
            <select
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="0 3 * * *">Daily (03:00 AM UTC)</option>
              <option value="0 2 * * 0">Weekly (Sundays 02:00 AM UTC)</option>
              <option value="0 0 1 * *">Monthly (1st day at 00:00 UTC)</option>
            </select>
          </div>

          {/* Retention */}
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Pause container checkbox */}
          <div className="flex items-center gap-3 pt-6">
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
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-5 py-2 rounded-lg transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>

          <button
            type="button"
            onClick={handleRunManualBackup}
            disabled={runningBackup}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {runningBackup ? "Executing..." : "⚡ Create Manual Backup Now"}
          </button>
        </div>
      </div>

      {/* RECORDS HISTORY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h4 className="text-md font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" /> Backup History
        </h4>

        {records.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No backup records found for this container.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Backup Path</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-xs text-slate-300">
                      {new Date(r.started_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400 max-w-xs truncate">
                      {r.s3_key || "-"}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {r.file_size_bytes ? `${(r.file_size_bytes / (1024 * 1024)).toFixed(2)} MB` : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          r.trigger_type === "manual"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : r.trigger_type === "restore"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {r.trigger_type === "manual"
                          ? "Manual"
                          : r.trigger_type === "restore"
                          ? "Restore"
                          : "Scheduled"}
                      </span>
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
                        <div className="flex flex-col" title={r.error_message}>
                          <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                            <XCircle className="w-4 h-4 flex-shrink-0" /> Failed
                          </span>
                          {r.error_message && (
                            <span className="text-[11px] text-rose-400/80 font-mono truncate max-w-[180px]">
                              {r.error_message}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === "completed" && r.trigger_type !== "restore" && (
                        <button
                          type="button"
                          onClick={() => handleOpenRestoreModal(r)}
                          className="inline-flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded transition border border-slate-700"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
