"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { LiveCaddyRoute } from "../interfaces/caddy";
import type { Job } from "../../jobs/interfaces/job";
import { JobService } from "../../jobs/services/job.service";
import { pollJob } from "../../jobs/pollJob";

export type CaddyStatusState = "idle" | "checking" | "running" | "stopped" | "unknown";

interface ParseResult {
  status: CaddyStatusState;
  routes: LiveCaddyRoute[];
}

function parseJobOutput(job: Job): ParseResult {
  if (job.status === "pending" || job.status === "running") {
    return { status: "checking", routes: [] };
  }
  if (job.status === "failed") return { status: "unknown", routes: [] };

  if (job.output.includes("caddy_running=false") || job.output.includes('"caddy_running":false')) {
    return { status: "stopped", routes: [] };
  }
  try {
    const parsed = JSON.parse(job.output);
    if (parsed.caddy_running === true) {
      return {
        status: "running",
        routes: Array.isArray(parsed.routes) ? (parsed.routes as LiveCaddyRoute[]) : [],
      };
    }
    if (parsed.caddy_running === false) return { status: "stopped", routes: [] };
  } catch {
    // output not JSON — treat as unknown
  }
  return { status: "unknown", routes: [] };
}

export function useCaddyStatus(nodeId: string) {
  const [status, setStatus] = useState<CaddyStatusState>("idle");
  const [liveRoutes, setLiveRoutes] = useState<LiveCaddyRoute[]>([]);
  // Each check gets a number; a newer check or unmounting invalidates the older one, including a
  // dispatch that has not answered yet.
  const runRef = useRef(0);
  const cancelPollRef = useRef<(() => void) | null>(null);

  const stopPolling = useCallback(() => {
    cancelPollRef.current?.();
    cancelPollRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      runRef.current++;
      stopPolling();
    };
  }, [stopPolling]);

  const check = useCallback(async () => {
    const run = ++runRef.current;
    stopPolling();
    setStatus("checking");
    setLiveRoutes([]);

    try {
      const job = await JobService.dispatchJob(nodeId, "caddy.status", "default");
      if (run !== runRef.current) return;

      cancelPollRef.current = pollJob(job.id, {
        onUpdate: (updated) => {
          const result = parseJobOutput(updated);
          if (result.status === "checking") return false;
          if (run === runRef.current) {
            setStatus(result.status);
            setLiveRoutes(result.routes);
          }
          return true;
        },
        onTimeout: () => {
          if (run === runRef.current) setStatus("unknown");
        },
      });
    } catch {
      if (run === runRef.current) setStatus("unknown");
    }
  }, [nodeId, stopPolling]);

  return { status, check, liveRoutes };
}
