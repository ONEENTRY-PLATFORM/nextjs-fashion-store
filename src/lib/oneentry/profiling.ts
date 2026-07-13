/**
 * OneEntry loader profiling.
 *
 * Wraps async loaders in a thin timer + records every call into an in-memory
 * ring buffer so an ops HTTP endpoint (`GET /api/perf-dump`) can hand out an
 * aggregated snapshot after a load test. Off by default — no measurable
 * overhead in production. Toggle via `.env`:
 *
 *   OE_PROFILE=1          — enable timing capture. Wrapped loaders log every
 *                           call as `[OE-timing] <name> ok <ms>ms`
 *                           (failures as `FAIL <ms>ms`) AND push into the
 *                           ring buffer available via `/api/perf-dump`.
 *   OE_PROFILE_SLOW_MS=N  — only log to stdout when a call is slower than N ms
 *                           (default 0 = log all). Filtering only affects
 *                           stdout — every call is still captured in the
 *                           in-memory buffer for the HTTP dump.
 *   PERF_DUMP_TOKEN=…     — required token for `/api/perf-dump` (see route).
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

/** Single timing record kept in the ring buffer. */
export interface TimingRecord {
  /** Loader label passed to `withTiming(name, ...)`. */
  name: string;
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
  /** false when the wrapped async threw. */
  ok: boolean;
  /** `Date.now()` at recording time. */
  ts: number;
}

// Ring buffer sized for ~10 minutes of load at ~3 loader calls per second
// per Node process — comfortably fits a k6 5-minute run without evicting
// early samples that would skew p95.
const RING_CAPACITY = 5000;

// Ring-buffer state is pinned to `globalThis` so every server bundle Next.js
// emits for this file shares one instance. Without this, route handlers
// (`app/api/perf-dump/route.ts`) and SSR pages each get their own compiled
// copy of `profiling.ts` with private module scope — `withTiming` records
// into the SSR chunk's ring, `/api/perf-dump` reads from the route chunk's
// ring, and dumps stay empty even under heavy load. Also survives HMR in
// `next dev` (module reload doesn't touch `globalThis`).
interface RingState {
  buffer: (TimingRecord | undefined)[];
  head: number;
  count: number;
}
const RING_KEY = '__oneentryTimingRing__';
type GlobalWithRing = typeof globalThis & { [RING_KEY]?: RingState };
function getRing(): RingState {
  const g = globalThis as GlobalWithRing;
  let state = g[RING_KEY];
  if (!state) {
    state = { buffer: new Array(RING_CAPACITY), head: 0, count: 0 };
    g[RING_KEY] = state;
  }
  return state;
}

/** Push a timing record into the ring buffer. Overwrites oldest entries
 *  once the buffer is full. Used internally by `withTiming`. */
function recordTiming(name: string, durationMs: number, ok: boolean): void {
  const ring = getRing();
  ring.buffer[ring.head] = { name, durationMs, ok, ts: Date.now() };
  ring.head = (ring.head + 1) % RING_CAPACITY;
  if (ring.count < RING_CAPACITY) ring.count += 1;
}

/** Read the ring buffer in insertion order (oldest → newest). */
export function readTimings(): TimingRecord[] {
  const ring = getRing();
  const out: TimingRecord[] = [];
  const start = ring.count < RING_CAPACITY ? 0 : ring.head;
  for (let i = 0; i < ring.count; i++) {
    const r = ring.buffer[(start + i) % RING_CAPACITY];
    if (r) out.push(r);
  }
  return out;
}

/** Drop every buffered timing. Useful before a fresh load-test run. */
export function clearTimings(): void {
  const ring = getRing();
  for (let i = 0; i < RING_CAPACITY; i++) ring.buffer[i] = undefined;
  ring.head = 0;
  ring.count = 0;
}

/** Per-loader aggregated stats over the current buffer contents. */
export interface TimingAggregate {
  name: string;
  count: number;
  failCount: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

/** Group the buffer by `name` and compute p50/p95/p99. Result is sorted
 *  by p95 descending — slowest loaders first, which is what you almost
 *  always want to look at after a load test. */
export function aggregateTimings(): TimingAggregate[] {
  const byName = new Map<string, TimingRecord[]>();
  for (const r of readTimings()) {
    const arr = byName.get(r.name);
    if (arr) arr.push(r);
    else byName.set(r.name, [r]);
  }
  const out: TimingAggregate[] = [];
  for (const [name, records] of byName) {
    const durations = records.map((r) => r.durationMs).sort((a, b) => a - b);
    const sum = durations.reduce((s, v) => s + v, 0);
    out.push({
      name,
      count: records.length,
      failCount: records.filter((r) => !r.ok).length,
      minMs: durations[0],
      maxMs: durations[durations.length - 1],
      avgMs: sum / durations.length,
      p50Ms: percentile(durations, 50),
      p95Ms: percentile(durations, 95),
      p99Ms: percentile(durations, 99),
    });
  }
  out.sort((a, b) => b.p95Ms - a.p95Ms);
  return out;
}

/**
 * Wrap an async loader so each call emits a `[OE-timing]` log line and
 * records the timing into the ring buffer. No-op when profiling is
 * disabled — the original function is returned unchanged, so there's zero
 * call-site overhead in production.
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
      recordTiming(name, dur, true);
      if (dur >= slowThresholdMs) {
        console.log(`[OE-timing] ${name} ok ${dur.toFixed(1)}ms`);
      }
      return result;
    } catch (err) {
      const dur = performance.now() - t0;
      recordTiming(name, dur, false);
      console.log(`[OE-timing] ${name} FAIL ${dur.toFixed(1)}ms`);
      throw err;
    }
  };
}
