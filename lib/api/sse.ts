/**
 * createSSEProxyStream
 *
 * Wraps an upstream SSE ReadableStream so the backing TCP connection to the
 * Go API is always closed when the browser disconnects, regardless of whether
 * the Next.js runtime propagates stream cancellation through `pipeTo()`.
 *
 * Three cleanup paths (in order of reliability):
 *   1. `ReadableStream.cancel()` — called by Next.js when the HTTP socket to
 *      the browser closes (pipeTo cancellation propagation).
 *   2. `signal.addEventListener('abort')` — fired when Next.js marks the
 *      inbound request as aborted (browser navigates away / closes tab).
 *   3. Idle timeout — if no chunk is enqueued within `idleTimeoutMs` the
 *      stream is force-closed. This is the safety net for cases where Next.js
 *      App Router fails to fire the abort signal (known upstream bug), which
 *      would otherwise leave zombie connections running indefinitely and drive
 *      CPU usage to 100% over time.
 *
 * The default idle timeout (75 s) is intentionally longer than the Go
 * backend's 30 s SSE keepalive tick, so normal long-lived streams are never
 * interrupted.
 */
export function createSSEProxyStream(
  upstreamBody: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  idleTimeoutMs = 75_000
): ReadableStream<Uint8Array> {
  const reader = upstreamBody.getReader();

  const doCancel = () => reader.cancel().catch(() => {});
  signal.addEventListener("abort", doCancel, { once: true });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let idleTimer: ReturnType<typeof setTimeout> | null = null;

      const resetIdleTimer = () => {
        if (idleTimer !== null) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          // No data received within the idle window — the browser has
          // almost certainly disconnected without the signal firing.
          doCancel();
        }, idleTimeoutMs);
      };

      // Start the timer immediately so a browser that disconnects before
      // receiving any data is also cleaned up.
      resetIdleTimer();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }
          resetIdleTimer();
          controller.enqueue(value);
        }
      } catch {
        // Stream was cancelled (doCancel / signal / timeout) or the upstream
        // closed with an error. Close the controller silently.
        try {
          controller.close();
        } catch {
          // controller already closed/errored — nothing to do
        }
      } finally {
        if (idleTimer !== null) clearTimeout(idleTimer);
        signal.removeEventListener("abort", doCancel);
        try {
          reader.releaseLock();
        } catch {
          // reader already released
        }
      }
    },

    cancel() {
      // Called by Next.js (via pipeTo) when the HTTP socket to the browser
      // closes. Ensure the upstream undici connection is torn down.
      doCancel();
    },
  });
}
