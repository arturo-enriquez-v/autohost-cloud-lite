"use client";

import React from "react";
import { HardDrive, Cloud, Database, Calendar, Play } from "lucide-react";
import { getScheduleSummary } from "./utils";

interface BackupConfigPanelProps {
  enabled: boolean;
  backupMethod: "volume" | "pg_dump";
  setBackupMethod: (method: "volume" | "pg_dump") => void;
  pgUser: string;
  setPgUser: (user: string) => void;
  retention: number;
  setRetention: (count: number) => void;
  pauseContainer: boolean;
  setPauseContainer: (pause: boolean) => void;
  freqInterval: "daily" | "weekly" | "monthly";
  freqTime: string;
  freqDayOfWeek: string;
  freqDayOfMonth: string;
  cronExpr: string;
  onScheduleChange: (
    interval: "daily" | "weekly" | "monthly",
    time: string,
    dayOfWeek: string,
    dayOfMonth: string
  ) => void;
  detectedVolumes: string[];
  selectedVolumes: string[];
  onToggleVolume: (volume: string) => void;
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
  runningBackup: boolean;
  onRunManualBackup: () => void;
}

export function BackupConfigPanel({
  enabled,
  backupMethod,
  setBackupMethod,
  pgUser,
  setPgUser,
  retention,
  setRetention,
  pauseContainer,
  setPauseContainer,
  freqInterval,
  freqTime,
  freqDayOfWeek,
  freqDayOfMonth,
  cronExpr,
  onScheduleChange,
  detectedVolumes,
  selectedVolumes,
  onToggleVolume,
  hasChanges,
  saving,
  onSave,
  runningBackup,
  onRunManualBackup,
}: BackupConfigPanelProps) {
  return (
    <div
      className={`bg-slate-900 border rounded-xl p-6 space-y-6 transition-all duration-300 ${
        enabled
          ? "border-slate-800 opacity-100"
          : "border-slate-800/60 opacity-60"
      }`}
    >
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
                  <div className="text-[10px] opacity-70 font-normal">
                    Raw .tar.gz of volumes
                  </div>
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
                  <div className="text-[10px] opacity-70 font-normal">
                    Logical SQL dump
                  </div>
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
                  onScheduleChange(
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
                    onScheduleChange(
                      freqInterval,
                      freqTime,
                      e.target.value,
                      freqDayOfMonth
                    )
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
                    onScheduleChange(
                      freqInterval,
                      freqTime,
                      freqDayOfWeek,
                      e.target.value
                    )
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
                  onScheduleChange(
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
            <span className="truncate">
              {getScheduleSummary(freqInterval, freqTime, freqDayOfWeek, freqDayOfMonth)}
            </span>
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
                  onChange={() => onToggleVolume(vol)}
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
            onClick={onSave}
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
          onClick={onRunManualBackup}
          disabled={runningBackup}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-4 h-4" />
          {runningBackup ? "Executing..." : "⚡ Create Manual Backup Now"}
        </button>
      </div>
    </div>
  );
}
