/**
 * createSSEProxyStream
 *
 * Wraps an upstream SSE ReadableStream so the backing TCP connection to the
 * Go API is always closed when the browser disconnects, regardless of whether
 * the Next.js runtime propagates stream cancellation through `pipeTo()`.
 *
 * Three cleanup paths (first to fire wins):
 *   1. `ReadableStream.cancel()` — called by Next.js when the HTTP socket to
 *      the browser closes (pipeTo cancellation propagation).
 *   2. `signal.addEventListener('abort')` — fired when Next.js marks the
 *      inbound request as aborted (browser navigates away / closes tab).
 *   3. Idle timeout — if no data arrives from upstream within IDLE_TIMEOUT_MS
 *      the stream is considered a zombie and is forcibly closed.  The timeout
 *      resets on every received chunk so it does not fire while the agent is
 *      actively streaming.  It only fires if the upstream (Go API) itself goes
 *      silent — e.g. because the browser closed the EventSource and the Go
 *      handler exited, stopping the fan-out, while Next.js failed to propagate
 *      the cancellation.
 */

// 90 s idle timeout.  The Go API sends a keepalive comment every 30 s, so a
// live stream will always reset this timer.  A zombie (browser gone, Go handler
// exited) will stop receiving data and trigger the timeout.
const IDLE_TIMEOUT_MS = 90_000;

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
      // Single abort promise created once — adds exactly ONE listener to
      // abort.signal for the entire lifetime of the stream.  Creating it
      // inside the loop (as makeAbortPromise did) accumulated one listener per
      // iteration, triggering MaxListenersExceededWarning.
      const abortPromise = new Promise<never>((_, reject) => {
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

      // Idle timeout: forcibly close the stream if no data arrives for
      // IDLE_TIMEOUT_MS.  Resets on every received chunk.
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      const resetIdle = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => abort.abort(), IDLE_TIMEOUT_MS);
      };
      resetIdle(); // start the initial idle timer

      try {
        while (true) {
          const { done, value } = await Promise.race([
            reader.read(),
            abortPromise,
          ]);
          if (done) {
            controller.close();
            break;
          }
          resetIdle(); // data arrived — reset the idle timer
          controller.enqueue(value);
        }
      } catch {
        // AbortError from doAbort() / idle timeout, or upstream read error.
        try {
          controller.close();
        } catch {
          // controller already closed — nothing to do
        }
      } finally {
        if (idleTimer) clearTimeout(idleTimer);
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
