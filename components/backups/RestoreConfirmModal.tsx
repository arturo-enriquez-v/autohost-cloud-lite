"use client";

import React from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import type { BackupRecord } from "@/lib/api/backups";

interface RestoreConfirmModalProps {
  isOpen: boolean;
  selectedRecord: BackupRecord | null;
  containerName: string;
  restoreConfirmInput: string;
  setRestoreConfirmInput: (input: string) => void;
  restoreStatusMsg: string;
  restoring: boolean;
  onClose: () => void;
  onConfirmRestore: () => void;
}

export function RestoreConfirmModal({
  isOpen,
  selectedRecord,
  containerName,
  restoreConfirmInput,
  setRestoreConfirmInput,
  restoreStatusMsg,
  restoring,
  onClose,
  onConfirmRestore,
}: RestoreConfirmModalProps) {
  if (!isOpen || !selectedRecord) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-6 max-w-lg w-full space-y-5">
        <div className="flex items-center gap-3 text-rose-400">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <h3 className="text-lg font-bold text-white">⚠️ Confirm Volume Restoration</h3>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          You are about to restore the backup archive from{" "}
          <strong className="text-white">
            {new Date(selectedRecord.started_at).toLocaleString()}
          </strong>
          .
        </p>

        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 space-y-1">
          <div>
            • The container <strong>{containerName}</strong> will be temporarily stopped during restoration.
          </div>
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
            onClick={onClose}
            disabled={restoring}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmRestore}
            disabled={restoring}
            className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            {restoring ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            {restoring ? "Restoring..." : "Confirm Restoration"}
          </button>
        </div>
      </div>
    </div>
  );
}
