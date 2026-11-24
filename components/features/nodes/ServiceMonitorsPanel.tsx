"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ServiceMonitorDialog } from "./ServiceMonitorDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

import type { ServiceMonitor, MonitorStatus, UptimeBucket, ServiceHealthState, AutoHealConfig } from "@/lib/types";
import { Activity, Plus, Pencil, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import { useServiceMonitors, useUptimeHistory } from "@/lib/features/nodes/monitoring/hooks/useServiceMonitors";
import { useNodePermissions } from "@/lib/features/users/hooks/usePermissions";
import { PERMS } from "@/lib/features/users/permissions";

// ─── Status indicator ─────────────────────────────────────────────────────────

function StatusDot({ monitor }: { monitor: ServiceMonitor }) {
  const map: Record<MonitorStatus, string> = {
    healthy: "bg-green-500",
    degraded: "bg-yellow-500",
    down: "bg-red-500",
    unknown: "bg-gray-400",
  };
  // A paused or stale monitor's status is out of date: don't show it as current.
  const outdated = !monitor.enabled || monitor.stale;
  const color = outdated ? "bg-gray-400" : (map[monitor.status] ?? "bg-gray-400");
  const label = !monitor.enabled ? "paused" : monitor.stale ? "no recent data" : monitor.status;
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${color} ring-2 ring-white`}
      aria-label={label}
      title={label}
    />
  );
}

function FreshnessBadge({ monitor }: { monitor: ServiceMonitor }) {
  if (!monitor.enabled) {
    return (
      <Badge variant="outline" className="text-[10px] text-muted-foreground">
        PAUSED
      </Badge>
    );
  }
  if (monitor.stale) {
    const since = monitor.lastCheckedAt
      ? `Last result ${new Date(monitor.lastCheckedAt).toLocaleString()}`
      : "No result received yet";
    return (
      <Badge
        variant="outline"
        className="text-[10px] text-muted-foreground"
        title={`${since}. The node may be offline; the status shown may be out of date.`}
      >
        NO RECENT DATA
      </Badge>
    );
  }
  return null;
}

function AutoHealBadge({ state, config }: { state?: ServiceHealthState; config?: AutoHealConfig }) {
  if (!config || !config.enabled) return null;
  const status = state?.status || 'HEALTHY';
  switch (status) {
    case 'RESTARTING':
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] animate-pulse">RESTARTING</Badge>;
    case 'RECREATING':
      return <Badge className="bg-[#70AEFF]/20 text-[#70AEFF] border-[#70AEFF]/30 text-[10px] animate-pulse">RECREATING COMPOSE</Badge>;
    case 'COOLING_DOWN':
      return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">COOLING DOWN</Badge>;
    case 'CRITICAL_FAILED':
      return <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] animate-bounce">CRITICAL FAILED</Badge>;
    case 'DEGRADED':
      return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[10px]">DEGRADED</Badge>;
    default:
      return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">AUTO-HEAL ACTIVE</Badge>;
  }
}

// ─── Uptime bar (24 h) ────────────────────────────────────────────────────────

function UptimeBar({ nodeId, monitorId }: { nodeId: string; monitorId: string }) {
  const { points } = useUptimeHistory(nodeId, monitorId);

  const color: Record<UptimeBucket, string> = {
    up: "bg-green-500",
    down: "bg-red-500",
    no_data: "bg-muted",
  };

  if (!points.length) {
    return <p className="text-xs text-muted-foreground">No data yet</p>;
  }

  return (
    <div className="flex h-4 w-full gap-px overflow-hidden rounded">
      {points.map((p) => (
        <div
          key={p.bucket}
          className={`flex-1 ${color[p.status]}`}
          title={`${new Date(p.bucket).toLocaleTimeString()} — ${p.status}`}
        />
      ))}
    </div>
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
}: {
  nodeId: string;
  monitor: ServiceMonitor;
  canManage: boolean;
  onEdit: (m: ServiceMonitor) => void;
  onDelete: (m: ServiceMonitor) => void;
  onToggle: (m: ServiceMonitor, enabled: boolean) => void;
}) {
  const checkTypeLabel: Record<string, string> = {
    process: "Process",
    tcp: "TCP",
    http: "HTTP",
  };

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <StatusDot monitor={monitor} />
          <span className="font-medium text-sm truncate">{monitor.serviceName}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            {checkTypeLabel[monitor.checkType] ?? monitor.checkType}
          </Badge>
          <FreshnessBadge monitor={monitor} />
          {monitor.enabled && !monitor.stale && (
            <AutoHealBadge config={monitor.autoHealConfig} state={monitor.autoHealState} />
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={monitor.enabled}
              onCheckedChange={(v) => onToggle(monitor, v)}
              aria-label="Enable monitoring"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(monitor)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(monitor)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        <span>Every {monitor.intervalSeconds}s</span>
        <span>Threshold: {monitor.failureThreshold} failures</span>
        {monitor.autoHealConfig?.enabled && (
          <span className="text-[#70AEFF]">
            Auto-Heal: {monitor.autoHealConfig.consecutive_failures_threshold ?? 3} failures → {monitor.autoHealConfig.restart?.enabled ? "restart" : "no restart"}
            {monitor.autoHealConfig.recreate?.enabled ? " → compose recreate" : ""}
          </span>
        )}
        {monitor.lastCheckedAt && (
          <span>Last: {new Date(monitor.lastCheckedAt).toLocaleTimeString()}</span>
        )}
      </div>

      {/* 24h uptime bar */}
      <UptimeBar nodeId={nodeId} monitorId={monitor.id} />
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  nodeId: string;
}

export function ServiceMonitorsPanel({ nodeId }: Props) {
  const { monitors, isLoading, create, update, remove } = useServiceMonitors(nodeId);
  const { can } = useNodePermissions(nodeId);
  const canManage = can(PERMS.MONITORS_MANAGE);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceMonitor | null>(null);

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (m: ServiceMonitor) => {
    setEditTarget(m);
    setDialogOpen(true);
  };

  const handleSave = async (payload: Parameters<typeof create>[0]) => {
    if (editTarget) {
      await update(editTarget.id, payload);
    } else {
      await create(payload);
    }
  };

  const handleDelete = async (m: ServiceMonitor) => {
    setDeleteTarget(m);
  };

  const [deleteTarget, setDeleteTarget] = useState<ServiceMonitor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
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
              No health checks configured.{canManage ? <> Click <strong>Add</strong> to start monitoring a service.</> : ""}
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
                  onDelete={handleDelete}
                  onToggle={handleToggle}
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
