"use client";

import React from "react";
import { FileArchive, Download, RotateCcw } from "lucide-react";
import type { BackupRecord } from "@/lib/api/backups";

interface BackupSnapshotsTableProps {
  snapshots: BackupRecord[];
  containerName: string;
  onDownload: (recordId: string) => void;
  onOpenRestoreModal: (record: BackupRecord) => void;
}

export function BackupSnapshotsTable({
  snapshots,
  containerName,
  onDownload,
  onOpenRestoreModal,
}: BackupSnapshotsTableProps) {
  if (snapshots.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No completed backup snapshots available for restore yet.
      </div>
    );
  }

  return (
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
          {snapshots.map((r) => (
            <tr key={r.id} className="hover:bg-slate-800/40 transition">
              <td className="py-3 px-4 font-mono text-xs text-slate-300">
                {new Date(r.started_at).toLocaleString()}
              </td>
              <td className="py-3 px-4 text-xs font-mono">
                <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded w-fit text-slate-300">
                  <FileArchive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>
                    {r.s3_key
                      ? r.s3_key.split("/").pop()
                      : `${containerName}.tar.gz`}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-xs font-mono">
                {r.file_size_bytes
                  ? `${(r.file_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                  : "-"}
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
                    onClick={() => onDownload(r.id)}
                    className="inline-flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded transition border border-slate-700 hover:border-blue-500/50"
                    title="Download Backup Archive"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" /> Download
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenRestoreModal(r)}
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
  );
}
