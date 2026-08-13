/** OneEntry loader profiling. */

const enabled = process.env.OE_PROFILE === '1';
const slowThresholdMs = (() => {
  const raw = process.env.OE_PROFILE_SLOW_MS;
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
})();

/** True when `OE_PROFILE=1` — export for callers that want to skip work they only need for profiling. */
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

// Ring buffer sized for ~10 minutes of load at ~3 loader calls per second per Node process.
const RING_CAPACITY = 5000;

// Ring-buffer state is pinned to `globalThis` so every server bundle Next.js emits for this file shares one instance.
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

/** Push a timing record into the ring buffer. */
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

/** Drop every buffered timing. */
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

/** Group the buffer by `name` and compute p50/p95/p99. */
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

/** Wrap an async loader so each call emits a `[OE-timing]` log line and records the timing into the ring buffer. */
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
        console.warn(`[OE-timing] ${name} ok ${dur.toFixed(1)}ms`);
      }
      return result;
    } catch (err) {
      const dur = performance.now() - t0;
      recordTiming(name, dur, false);
      console.warn(`[OE-timing] ${name} FAIL ${dur.toFixed(1)}ms`);
      throw err;
    }
  };
}
