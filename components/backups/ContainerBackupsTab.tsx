"use client";

import React from "react";
import { RefreshCw, FileArchive, Clock } from "lucide-react";
import { useContainerBackups } from "./hooks/useContainerBackups";
import { BackupHeaderCard } from "./BackupHeaderCard";
import { BackupConfigPanel } from "./BackupConfigPanel";
import { BackupSnapshotsTable } from "./BackupSnapshotsTable";
import { BackupActivityLogTable } from "./BackupActivityLogTable";
import { RestoreConfirmModal } from "./RestoreConfirmModal";

const EMPTY_VOLUMES: string[] = [];

interface Props {
  nodeId: string;
  containerName: string;
  detectedVolumes?: string[];
}

export function ContainerBackupsTab({
  nodeId,
  containerName,
  detectedVolumes = EMPTY_VOLUMES,
}: Props) {
  const {
    loading,
    saving,
    runningBackup,
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
  } = useContainerBackups({ nodeId, containerName, detectedVolumes });

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin" /> Loading backup module...
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header & Toggle Card */}
      <BackupHeaderCard
        enabled={enabled}
        onToggleEnabled={handleToggleEnabled}
      />

      {/* Configuration & Schedule Panel */}
      <BackupConfigPanel
        enabled={enabled}
        backupMethod={backupMethod}
        setBackupMethod={setBackupMethod}
        pgUser={pgUser}
        setPgUser={setPgUser}
        retention={retention}
        setRetention={setRetention}
        pauseContainer={pauseContainer}
        setPauseContainer={setPauseContainer}
        freqInterval={freqInterval}
        freqTime={freqTime}
        freqDayOfWeek={freqDayOfWeek}
        freqDayOfMonth={freqDayOfMonth}
        cronExpr={cronExpr}
        onScheduleChange={handleScheduleChange}
        detectedVolumes={detectedVolumes}
        selectedVolumes={selectedVolumes}
        onToggleVolume={toggleVolume}
        hasChanges={hasChanges}
        saving={saving}
        onSave={handleSaveConfig}
        runningBackup={runningBackup}
        onRunManualBackup={handleRunManualBackup}
      />

      {/* Sub-tabs: Snapshots vs Activity Log */}
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
          <BackupSnapshotsTable
            snapshots={completedSnapshots}
            containerName={containerName}
            onDownload={handleDownload}
            onOpenRestoreModal={handleOpenRestoreModal}
          />
        ) : (
          <BackupActivityLogTable
            records={records}
            containerName={containerName}
          />
        )}
      </div>

      {/* Restore Confirmation Modal */}
      <RestoreConfirmModal
        isOpen={restoreModalOpen}
        selectedRecord={selectedRecord}
        containerName={containerName}
        restoreConfirmInput={restoreConfirmInput}
        setRestoreConfirmInput={setRestoreConfirmInput}
        restoreStatusMsg={restoreStatusMsg}
        restoring={restoring}
        onClose={() => setRestoreModalOpen(false)}
        onConfirmRestore={handleConfirmRestore}
      />
    </div>
  );
}
