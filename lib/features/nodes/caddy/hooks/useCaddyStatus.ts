"use client";

import { useState, useCallback, useRef } from "react";
import type { LiveCaddyRoute } from "../interfaces/caddy";
import type { Job } from "../../jobs/interfaces/job";
import { JobService } from "../../jobs/services/job.service";

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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const check = useCallback(async () => {
    stopPolling();
    setStatus("checking");
    setLiveRoutes([]);

    try {
      const job = await JobService.dispatchJob(nodeId, "caddy.status", "default");

      let attempts = 0;
      const MAX_ATTEMPTS = 15;

      pollingRef.current = setInterval(async () => {
        attempts++;
        try {
          const updated = await JobService.getJob(job.id);
          const result = parseJobOutput(updated);
          if (result.status !== "checking") {
            stopPolling();
            setStatus(result.status);
            setLiveRoutes(result.routes);
            return;
          }
        } catch {
          // ignore transient errors
        }
        if (attempts >= MAX_ATTEMPTS) {
          stopPolling();
          setStatus("unknown");
        }
      }, 2000);
    } catch {
      setStatus("unknown");
    }
  }, [nodeId, stopPolling]);

  return { status, check, liveRoutes };
}
