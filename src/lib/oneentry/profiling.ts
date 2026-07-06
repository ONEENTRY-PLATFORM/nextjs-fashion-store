/**
 * OneEntry loader profiling.
 *
 * Wraps async loaders in a thin timer. Off by default — no measurable
 * overhead in production. Toggle via `.env`:
 *
 *   OE_PROFILE=1          — log every wrapped call as
 *                             `[OE-timing] <name> ok <ms>ms`
 *                           (failures logged as `FAIL <ms>ms`).
 *   OE_PROFILE_SLOW_MS=N  — only log calls slower than N ms
 *                           (default 0 = log all when profiling is on).
 *
 * Log lines land in stdout so they show up in Vercel Logs / your APM sink
 * verbatim. Grep by `[OE-timing]` prefix. Use with a scripted browse of the
 * app (playwright / k6) to get a p50/p95 picture of each SDK call.
 *
 * Wrapping strategy: `withTiming` sits *outside* `unstable_cache` / `cache`,
 * so the reported time is what the caller actually waits. A cache hit shows
 * up as a fast reading (~ 1 ms), a miss shows the real network round-trip —
 * that split is the whole point of profiling.
 */

const enabled = process.env.OE_PROFILE === '1';
const slowThresholdMs = (() => {
  const raw = process.env.OE_PROFILE_SLOW_MS;
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
})();

/** True when `OE_PROFILE=1` — export for callers that want to skip work
 *  they only need for profiling (e.g. building a rich label). */
export const OE_PROFILE_ENABLED = enabled;

/**
 * Wrap an async loader so each call emits a `[OE-timing]` log line.
 * No-op when profiling is disabled — the original function is returned
 * unchanged, so there's zero call-site overhead in production.
 *
 * @example
 *   export const loadStores = withTiming('loadStores', cache(async (lang) => {
 *     ...
 *   }));
 */
export function withTiming<A extends unknown[], R>(
  name: string,
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  if (!enabled) return fn;
  return async (...args: A): Promise<R> => {
    const t0 = performance.now();
    try {
      const result = await fn(...args);
      const dur = performance.now() - t0;
      if (dur >= slowThresholdMs) {
        console.log(`[OE-timing] ${name} ok ${dur.toFixed(1)}ms`);
      }
      return result;
    } catch (err) {
      const dur = performance.now() - t0;
      console.log(`[OE-timing] ${name} FAIL ${dur.toFixed(1)}ms`);
      throw err;
    }
  };
}
