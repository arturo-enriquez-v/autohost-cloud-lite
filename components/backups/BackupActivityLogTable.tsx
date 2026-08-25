"use client";

import React from "react";
import {
  RotateCcw,
  Download,
  Bot,
  User,
  FileArchive,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type { BackupRecord } from "@/lib/api/backups";
import { formatSnapshotDateFromKey } from "./utils";

interface BackupActivityLogTableProps {
  records: BackupRecord[];
  containerName: string;
}

export function BackupActivityLogTable({
  records,
  containerName,
}: BackupActivityLogTableProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No activity records found.
      </div>
    );
  }

  return (
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
                    <span>
                      {r.s3_key ? r.s3_key.split("/").pop() : `${containerName}.tar.gz`}
                    </span>
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
  );
}
