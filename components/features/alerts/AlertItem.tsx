"use client";

import { Badge } from "@/components/ui/badge";
import { AlertIcon } from "./AlertIcon";
import type { AlertEvent, AlertEventType } from "@/lib/features/alerts/interfaces/alert";

const ALERT_LABELS: Record<AlertEventType, string> = {
  offline: "Offline",
  cpu: "High CPU",
  ram: "High RAM",
  disk: "Low Disk",
};

const ALERT_VARIANTS: Record<AlertEventType, "destructive" | "default" | "secondary"> = {
  offline: "destructive",
  cpu: "default",
  ram: "default",
  disk: "default",
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export function AlertItem({ event }: { event: AlertEvent }) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50">
      <div className="mt-0.5">
        <AlertIcon type={event.alert_type} />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">
            {ALERT_LABELS[event.alert_type] ?? event.alert_type}
          </h4>
          <div className="flex items-center gap-2">
            <Badge
              variant={ALERT_VARIANTS[event.alert_type] ?? "secondary"}
              className={event.alert_type !== "offline" ? "bg-warning text-black" : undefined}
            >
              {ALERT_LABELS[event.alert_type] ?? event.alert_type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatRelative(event.created_at)}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{stripHtml(event.message)}</p>
      </div>
    </div>
  );
}
