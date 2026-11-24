"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Job, JobCommandType } from "../interfaces/job";
import { JobService } from "../services/job.service";
import { pollJob } from "../pollJob";

export function useNodeJobs(nodeId: string) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await JobService.getJobsByNode(nodeId);
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
  // A newer dispatch or unmounting invalidates the older one, including a dispatch still in flight.
  const runRef = useRef(0);
  const cancelPollRef = useRef<(() => void) | null>(null);

  const stopPolling = useCallback(() => {
    cancelPollRef.current?.();
    cancelPollRef.current = null;
  }, []);

  const dispatch = useCallback(
    async (nodeId: string, commandName: string, commandType: JobCommandType = "custom") => {
      const run = ++runRef.current;
      setIsDispatching(true);
      setActiveJob(null);
      stopPolling();

      try {
        const job = await JobService.dispatchJob(nodeId, commandName, commandType);
        if (run !== runRef.current) return;
        setActiveJob(job);

        cancelPollRef.current = pollJob(job.id, {
          onUpdate: (updated) => {
            if (run !== runRef.current) return true;
            setActiveJob(updated);
            return updated.status === "completed" || updated.status === "failed";
          },
          onTimeout: () => {
            if (run !== runRef.current) return;
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
          },
        });
      } finally {
        if (run === runRef.current) setIsDispatching(false);
      }
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => {
      runRef.current++;
      stopPolling();
    };
  }, [stopPolling]);

  return { dispatch, isDispatching, activeJob, stopPolling };
}
