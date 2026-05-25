/**
 * createSSEProxyStream
 *
 * Wraps an upstream SSE ReadableStream so the backing TCP connection to the
 * Go API is always closed when the browser disconnects, regardless of whether
 * the Next.js runtime propagates stream cancellation through `pipeTo()`.
 *
 * Two cleanup paths:
 *   1. `ReadableStream.cancel()` — called by Next.js when the HTTP socket to
 *      the browser closes (pipeTo cancellation propagation).
 *   2. `signal.addEventListener('abort')` — fired when Next.js marks the
 *      inbound request as aborted (browser navigates away / closes tab).
 *
 * Without this wrapper, zombie SSE connections accumulate in the Node.js
 * process (one per browser visit that closes without the stream being
 * cleaned up), and the continuous data flow from the Go backend drives CPU
 * usage to 100% over time.
 */
export function createSSEProxyStream(
  upstreamBody: ReadableStream<Uint8Array>,
  signal: AbortSignal
): ReadableStream<Uint8Array> {
  const reader = upstreamBody.getReader();

  const doCancel = () => reader.cancel().catch(() => {});
  signal.addEventListener("abort", doCancel, { once: true });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }
          controller.enqueue(value);
        }
      } catch {
        // Stream was cancelled or the upstream closed with an error.
        // Close the controller silently — the client has already gone away.
        try {
          controller.close();
        } catch {
          // controller already closed/errored — nothing to do
        }
      } finally {
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
