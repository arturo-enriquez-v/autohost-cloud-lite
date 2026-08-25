"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

interface BackupHeaderCardProps {
  enabled: boolean;
  onToggleEnabled: () => void;
}

export function BackupHeaderCard({ enabled, onToggleEnabled }: BackupHeaderCardProps) {
  return (
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
          onClick={onToggleEnabled}
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
  );
}
