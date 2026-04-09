"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Job } from "@/lib/types";
import { fetchWithAuth } from "@/lib/api/fetch-client";

export function useNodeJobs(nodeId: string) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/nodes/${nodeId}/jobs`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data: Job[] = await res.json();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, isLoading, error, refresh: fetchJobs };
}

/**
 * Dispatch a job and poll for its result.
 */
export function useJobDispatch() {
  const [isDispatching, setIsDispatching] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const dispatch = useCallback(
    async (nodeId: string, commandName: string, commandType: string = "custom") => {
      setIsDispatching(true);
      setActiveJob(null);
      stopPolling();

      try {
        const res = await fetchWithAuth(`/api/nodes/${nodeId}/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commandName, commandType }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to dispatch job");
        }

        const job: Job = await res.json();
        setActiveJob(job);

        // Poll every 2s until terminal status, max 30s (15 attempts)
        let attempts = 0;
        const MAX_ATTEMPTS = 15;

        pollingRef.current = setInterval(async () => {
          attempts++;
          try {
            const pollRes = await fetchWithAuth(`/api/jobs/${job.id}`);
            if (!pollRes.ok) return;
            const updated: Job = await pollRes.json();
            setActiveJob(updated);

            if (updated.status === "completed" || updated.status === "failed") {
              stopPolling();
              return;
            }
          } catch {
            // ignore polling errors
          }

          // Stop after max attempts — node likely offline
          if (attempts >= MAX_ATTEMPTS) {
            stopPolling();
            setActiveJob((prev) =>
              prev
                ? { ...prev, status: "failed", error: "No response from node (timeout). The node may be offline or the gRPC connection is not established." }
                : prev
            );
          }
        }, 2000);
      } catch (err) {
        throw err;
      } finally {
        setIsDispatching(false);
      }
    },
    [stopPolling]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { dispatch, isDispatching, activeJob, stopPolling };
}
