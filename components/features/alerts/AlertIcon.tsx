"use client";

import { AlertTriangle, AlertCircle, ServerCrash } from "lucide-react";
import type { AlertEventType } from "@/lib/features/alerts/interfaces/alert";

export function AlertIcon({ type }: { type: AlertEventType }) {
  if (type === "offline") {
    return (
      <div className="rounded-full bg-destructive/10 p-2">
        <ServerCrash className="h-5 w-5 text-destructive" />
      </div>
    );
  }
  if (type === "cpu" || type === "ram" || type === "disk") {
    return (
      <div className="rounded-full bg-warning/10 p-2">
        <AlertTriangle className="h-5 w-5 text-warning" />
      </div>
    );
  }
  return (
    <div className="rounded-full bg-primary/10 p-2">
      <AlertCircle className="h-5 w-5 text-primary" />
    </div>
  );
}
