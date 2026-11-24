"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ServiceMonitorDialog } from "./ServiceMonitorDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

import type { ServiceMonitor, UpsertServiceMonitorPayload } from "@/lib/types";
import { Activity, ChevronDown, ChevronUp, Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import {
  useEventHistory,
  useServiceMonitors,
  useUptimeHistory,
} from "@/lib/features/nodes/monitoring/hooks/useServiceMonitors";
import {
  autoHealActivity,
  bucketTone,
  describeAutoHeal,
  describeTarget,
  formatPercent,
  monitorState,
  uptimePercent,
  type MonitorTone,
} from "@/lib/features/nodes/monitoring/monitor-status";
import { useNodePermissions } from "@/lib/features/users/hooks/usePermissions";
import { PERMS } from "@/lib/features/users/permissions";

const DOT: Record<MonitorTone, string> = {
  ok: "bg-green-500",
  warn: "bg-yellow-500",
  bad: "bg-red-500",
  muted: "bg-gray-400",
};

const TEXT: Record<MonitorTone, string> = {
  ok: "text-green-600 dark:text-green-400",
  warn: "text-yellow-600 dark:text-yellow-400",
  bad: "text-red-600 dark:text-red-400",
  muted: "text-muted-foreground",
};

const BAR: Record<MonitorTone, string> = {
  ok: "bg-green-500",
  warn: "bg-yellow-500",
  bad: "bg-red-500",
  muted: "bg-muted",
};

const CHECK_TYPE_LABEL: Record<string, string> = {
  process: "Container",
  tcp: "TCP",
  http: "HTTP",
};

const BUCKET_MINUTES = 5;

// ─── Uptime bar (24 h) ────────────────────────────────────────────────────────

function UptimeBar({ nodeId, monitorId }: { nodeId: string; monitorId: string }) {
  const { points } = useUptimeHistory(nodeId, monitorId);

  if (!points.length) {
    return <p className="text-xs text-muted-foreground">No data yet</p>;
  }

  const percent = uptimePercent(points);
  const time = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Last 24 hours</span>
        <span>{percent === null ? "No checks" : `${formatPercent(percent)} of checks passed`}</span>
      </div>
      <div className="flex h-4 w-full gap-px overflow-hidden rounded">
        {points.map((p) => {
          const start = new Date(p.bucket);
          const end = new Date(start.getTime() + BUCKET_MINUTES * 60_000);
          const detail =
            p.status === "no_data"
              ? "no checks"
              : p.up !== null && p.down !== null
                ? `${p.up} passed, ${p.down} failed`
                : p.status === "up"
                  ? "all checks passed"
                  : "some checks failed";
          return (
            <div
              key={p.bucket}
              className={`flex-1 ${BAR[bucketTone(p)]}`}
              title={`${time(start)}–${time(end)}: ${detail}`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>24 h ago</span>
        <span className="flex items-center gap-2">
          <Legend tone="ok" label="passed" />
          <Legend tone="warn" label="some failed" />
          <Legend tone="bad" label="failed" />
        </span>
        <span>now</span>
      </div>
    </div>
  );
}

function Legend({ tone, label }: { tone: MonitorTone; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-sm ${BAR[tone]}`} />
      {label}
    </span>
  );
}

// ─── Check history ────────────────────────────────────────────────────────────

function CheckHistory({ nodeId, monitorId }: { nodeId: string; monitorId: string }) {
  const { events, isLoading, error } = useEventHistory(nodeId, monitorId, true);

  if (isLoading && !events.length) return <p className="text-xs text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-xs text-destructive">{error}</p>;
  if (!events.length) return <p className="text-xs text-muted-foreground">No checks yet.</p>;

  return (
    <ul className="max-h-56 overflow-y-auto rounded border divide-y text-xs">
      {events.map((e) => (
        <li key={e.id} className="flex items-center gap-2 px-2 py-1">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${e.status === "up" ? DOT.ok : DOT.bad}`}
            aria-label={e.status === "up" ? "passed" : "failed"}
          />
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {new Date(e.checkedAt).toLocaleTimeString()}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground w-14 text-right">{e.latencyMs} ms</span>
          <span className="truncate" title={e.message}>
            {e.message || (e.status === "up" ? "OK" : "Failed")}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── Monitor row ──────────────────────────────────────────────────────────────

function MonitorRow({
  nodeId,
  monitor,
  canManage,
  onEdit,
  onDelete,
  onToggle,
  onCheckNow,
}: {
  nodeId: string;
  monitor: ServiceMonitor;
  canManage: boolean;
  onEdit: (m: ServiceMonitor) => void;
  onDelete: (m: ServiceMonitor) => void;
  onToggle: (m: ServiceMonitor, enabled: boolean) => void;
  onCheckNow: (m: ServiceMonitor) => Promise<void>;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [checking, setChecking] = useState(false);

  const state = monitorState(monitor);
  const activity = autoHealActivity(monitor);
  const autoHeal = describeAutoHeal(monitor);
  const showReason = (state.tone === "warn" || state.tone === "bad") && monitor.lastMessage;

  const checkNow = async () => {
    setChecking(true);
    try {
      await onCheckNow(monitor);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${DOT[state.tone]} ring-2 ring-white`}
            aria-hidden
          />
          <span className="font-medium text-sm truncate">{monitor.serviceName}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            {CHECK_TYPE_LABEL[monitor.checkType] ?? monitor.checkType}
          </Badge>
          <span className={`text-xs font-medium ${TEXT[state.tone]}`}>{state.label}</span>
          {activity && (
            <Badge variant="outline" className={`text-[10px] ${TEXT[activity.tone]}`}>
              {activity.label}
            </Badge>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={checkNow}
              disabled={!monitor.enabled || checking}
              title={monitor.enabled ? "Check now" : "Enable the monitor to check it"}
              aria-label="Check now"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
            </Button>
            <Switch
              checked={monitor.enabled}
              onCheckedChange={(v) => onToggle(monitor, v)}
              aria-label="Enable monitoring"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(monitor)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(monitor)}
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* What is checked and how */}
      <div className="flex gap-x-4 gap-y-1 text-xs text-muted-foreground flex-wrap">
        <span className="truncate max-w-full" title={describeTarget(monitor)}>
          {describeTarget(monitor)}
        </span>
        <span>
          Every {monitor.intervalSeconds}s · down after {monitor.failureThreshold} failed{" "}
          {monitor.failureThreshold === 1 ? "check" : "checks"}
        </span>
        {autoHeal && (
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Auto-heal: {autoHeal}
          </span>
        )}
        {monitor.lastCheckedAt && (
          <span title={new Date(monitor.lastCheckedAt).toLocaleString()}>
            Checked {formatDistanceToNow(new Date(monitor.lastCheckedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Why it is failing */}
      {showReason && (
        <p className={`text-xs ${TEXT[state.tone]} break-words`}>Last check: {monitor.lastMessage}</p>
      )}

      <UptimeBar nodeId={nodeId} monitorId={monitor.id} />

      <button
        type="button"
        onClick={() => setShowHistory((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        aria-expanded={showHistory}
      >
        {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Recent checks
      </button>
      {showHistory && <CheckHistory nodeId={nodeId} monitorId={monitor.id} />}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  nodeId: string;
}

export function ServiceMonitorsPanel({ nodeId }: Props) {
  const { monitors, isLoading, create, update, remove, checkNow } = useServiceMonitors(nodeId);
  const { can } = useNodePermissions(nodeId);
  const canManage = can(PERMS.MONITORS_MANAGE);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceMonitor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceMonitor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (m: ServiceMonitor) => {
    setEditTarget(m);
    setDialogOpen(true);
  };

  const handleSave = async (payload: UpsertServiceMonitorPayload) => {
    if (editTarget) {
      await update(editTarget.id, payload);
    } else {
      await create(payload);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the monitor");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (m: ServiceMonitor, enabled: boolean) => {
    try {
      await update(m.id, {
        nodeId,
        serviceName: m.serviceName,
        checkType: m.checkType,
        httpUrl: m.httpUrl,
        httpExpectedStatus: m.httpExpectedStatus,
        tcpHost: m.tcpHost,
        tcpPort: m.tcpPort,
        intervalSeconds: m.intervalSeconds,
        failureThreshold: m.failureThreshold,
        notifyTelegram: m.notifyTelegram,
        enabled,
        autoHealConfig: m.autoHealConfig,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the monitor");
    }
  };

  const handleCheckNow = async (m: ServiceMonitor) => {
    try {
      await checkNow(m.id);
      toast.success(`Checking ${m.serviceName}…`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not run the check");
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Activity className="h-4 w-4 shrink-0" />
            Monitoring &amp; Health
          </CardTitle>
          {canManage && (
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : monitors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No health checks configured.
              {canManage ? (
                <>
                  {" "}
                  Click <strong>Add</strong> to check that a container is running, a URL answers or a port is open.
                </>
              ) : (
                ""
              )}
            </p>
          ) : (
            <div className="space-y-2">
              {monitors.map((m) => (
                <MonitorRow
                  key={m.id}
                  nodeId={nodeId}
                  monitor={m}
                  canManage={canManage}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onToggle={handleToggle}
                  onCheckNow={handleCheckNow}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ServiceMonitorDialog
        nodeId={nodeId}
        open={dialogOpen}
        monitor={editTarget}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Service Monitor?"
        description={`Are you sure you want to remove monitoring for "${deleteTarget?.serviceName ?? ""}"?`}
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
