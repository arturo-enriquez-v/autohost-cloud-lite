// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import type { Job } from "./interfaces/job";
import { JobService } from "./services/job.service";

interface PollJobOptions {
  /** Called with every fetched version of the job. Return true to stop polling. */
  onUpdate: (job: Job) => boolean | void;
  /** Called once if the job is still not done after `maxAttempts`. */
  onTimeout?: () => void;
  intervalMs?: number;
  maxAttempts?: number;
}

/**
 * Polls a job until `onUpdate` returns true, the attempts run out, or the returned cancel function is
 * called. Each poll owns its timer, so overlapping polls can never leave one running forever.
 */
export function pollJob(
  jobId: string,
  { onUpdate, onTimeout, intervalMs = 2000, maxAttempts = 15 }: PollJobOptions
): () => void {
  let attempts = 0;
  let stopped = false;

  const stop = () => {
    stopped = true;
    clearInterval(timer);
  };

  const timer = setInterval(async () => {
    if (stopped) return;
    attempts++;
    try {
      const job = await JobService.getJob(jobId);
      if (stopped) return;
      if (onUpdate(job) === true) {
        stop();
        return;
      }
    } catch {
      // ignore transient errors
    }
    if (!stopped && attempts >= maxAttempts) {
      stop();
      onTimeout?.();
    }
  }, intervalMs);

  return stop;
}
