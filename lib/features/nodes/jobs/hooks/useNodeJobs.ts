"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Job } from "../../types";
import { fetchNodeJobs, dispatchJob, fetchJob } from "../../api";

export function useNodeJobs(nodeId: string) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await fetchNodeJobs(nodeId);
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
        const job = await dispatchJob(nodeId, commandName, commandType);
        setActiveJob(job);

        let attempts = 0;
        const MAX_ATTEMPTS = 15;

        pollingRef.current = setInterval(async () => {
          attempts++;
          try {
            const updated = await fetchJob(job.id);
            setActiveJob(updated);

            if (updated.status === "completed" || updated.status === "failed") {
              stopPolling();
              return;
            }
          } catch {
            // ignore polling errors
          }

          if (attempts >= MAX_ATTEMPTS) {
            stopPolling();
            setActiveJob((prev) =>
              prev
                ? {
                    ...prev,
                    status: "failed",
                    error:
                      "No response from node (timeout). The node may be offline or the gRPC connection is not established.",
                  }
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

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { dispatch, isDispatching, activeJob, stopPolling };
}
