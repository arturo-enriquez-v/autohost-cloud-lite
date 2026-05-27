/**
 * createSSEProxyStream
 *
 * Wraps an upstream SSE ReadableStream so the backing TCP connection to the
 * Go API is always closed when the browser disconnects, regardless of whether
 * the Next.js runtime propagates stream cancellation through `pipeTo()`.
 *
 * Two cleanup paths:
 *   1. `ReadableStream.cancel()` — called by Next.js when the HTTP socket to
 *      the browser closes (pipeTo cancellation propagation). This is the most
 *      reliable path in Node.js runtime.
 *   2. `signal.addEventListener('abort')` — fired when Next.js marks the
 *      inbound request as aborted (browser navigates away / closes tab).
 *
 * Both paths use the same internal AbortController. When either fires,
 * `Promise.race` immediately rejects the in-flight `reader.read()`, breaking
 * the loop and releasing the upstream Go connection.
 *
 * NOTE: A previous implementation used an idle-timeout (75 s) as a third
 * safety net. That approach was removed because the Go backend sends a live
 * metric every ~5 s, which continuously reset the timer and prevented it from
 * ever firing on zombie connections (browser gone, agent still streaming).
 */
export function createSSEProxyStream(
  upstreamBody: ReadableStream<Uint8Array>,
  signal: AbortSignal
): ReadableStream<Uint8Array> {
  // Internal abort controller that unifies both cleanup paths.
  const abort = new AbortController();

  const doAbort = () => abort.abort();
  signal.addEventListener("abort", doAbort, { once: true });

  const reader = upstreamBody.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // Pre-built reject promise so we can race it against each read.
      // Recreated each iteration because a resolved/rejected promise can't be
      // reused, but a new Promise wrapping the same signal is cheap.
      const makeAbortPromise = () =>
        new Promise<never>((_, reject) => {
          if (abort.signal.aborted) {
            reject(new DOMException("Stream aborted", "AbortError"));
            return;
          }
          abort.signal.addEventListener(
            "abort",
            () => reject(new DOMException("Stream aborted", "AbortError")),
            { once: true }
          );
        });

      try {
        while (true) {
          const { done, value } = await Promise.race([
            reader.read(),
            makeAbortPromise(),
          ]);
          if (done) {
            controller.close();
            break;
          }
          controller.enqueue(value);
        }
      } catch {
        // AbortError from doAbort(), or upstream read error.
        try {
          controller.close();
        } catch {
          // controller already closed — nothing to do
        }
      } finally {
        signal.removeEventListener("abort", doAbort);
        reader.cancel().catch(() => {});
        try {
          reader.releaseLock();
        } catch {
          // already released
        }
      }
    },

    cancel() {
      // Called by Next.js when the HTTP socket to the browser closes.
      // Abort the internal controller to break the Promise.race in start().
      doAbort();
    },
  });
}
