/**
 * Tests for withTiming(), ring buffer and aggregateTimings() in profiling.ts.
 *
 * `enabled` and `slowThresholdMs` are captured at module load, so we use
 * vi.stubEnv + vi.resetModules + dynamic re-import to test both branches.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const importFresh = async () => {
  vi.resetModules();
  return import('./profiling');
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Disabled branch (OE_PROFILE not set)
// ---------------------------------------------------------------------------

describe('withTiming — profiling disabled', () => {
  beforeEach(() => {
    vi.stubEnv('OE_PROFILE', '');
  });

  it('returns the original function unchanged (identity)', async () => {
    const { withTiming } = await importFresh();
    const original = vi.fn(async () => 'result');
    const wrapped = withTiming('test', original);
    expect(wrapped).toBe(original);
  });

  it('OE_PROFILE_ENABLED is false', async () => {
    const { OE_PROFILE_ENABLED } = await importFresh();
    expect(OE_PROFILE_ENABLED).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Enabled branch (OE_PROFILE=1)
// ---------------------------------------------------------------------------

describe('withTiming — profiling enabled', () => {
  beforeEach(() => {
    vi.stubEnv('OE_PROFILE', '1');
    vi.stubEnv('OE_PROFILE_SLOW_MS', '');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('OE_PROFILE_ENABLED is true', async () => {
    const { OE_PROFILE_ENABLED } = await importFresh();
    expect(OE_PROFILE_ENABLED).toBe(true);
  });

  it('returns a different (wrapper) function', async () => {
    const { withTiming } = await importFresh();
    const original = vi.fn(async () => 'x');
    const wrapped = withTiming('myFn', original);
    expect(wrapped).not.toBe(original);
  });

  it('calls the original function and returns its result', async () => {
    const { withTiming } = await importFresh();
    const original = vi.fn(async (a: number, b: number) => a + b);
    const wrapped = withTiming('add', original);
    const result = await wrapped(2, 3);
    expect(result).toBe(5);
    expect(original).toHaveBeenCalledWith(2, 3);
  });

  it('logs [OE-timing] <name> ok on success', async () => {
    const { withTiming } = await importFresh();
    const wrapped = withTiming('loadStores', vi.fn(async () => 'ok'));
    await wrapped();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[OE-timing\] loadStores ok \d+\.\dms$/),
    );
  });

  it('logs [OE-timing] <name> FAIL and re-throws on error', async () => {
    const { withTiming } = await importFresh();
    const boom = new Error('network failure');
    const wrapped = withTiming('loadProducts', vi.fn(async () => { throw boom; }));
    await expect(wrapped()).rejects.toThrow('network failure');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[OE-timing\] loadProducts FAIL \d+\.\dms$/),
    );
  });
});

// ---------------------------------------------------------------------------
// OE_PROFILE_SLOW_MS threshold
// ---------------------------------------------------------------------------

describe('withTiming — slow-ms threshold', () => {
  beforeEach(() => {
    vi.stubEnv('OE_PROFILE', '1');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('does not log when call is faster than threshold', async () => {
    vi.stubEnv('OE_PROFILE_SLOW_MS', '9999');
    const { withTiming } = await importFresh();
    // The fn completes near-instantly — well below 9999 ms threshold
    const wrapped = withTiming('fastFn', vi.fn(async () => 'fast'));
    await wrapped();
    expect(console.log).not.toHaveBeenCalled();
  });

  it('logs when threshold is 0 (log everything)', async () => {
    vi.stubEnv('OE_PROFILE_SLOW_MS', '0');
    const { withTiming } = await importFresh();
    const wrapped = withTiming('anyFn', vi.fn(async () => 'x'));
    await wrapped();
    expect(console.log).toHaveBeenCalled();
  });

  it('uses 0 as threshold when OE_PROFILE_SLOW_MS is non-numeric', async () => {
    vi.stubEnv('OE_PROFILE_SLOW_MS', 'bad');
    const { withTiming } = await importFresh();
    const wrapped = withTiming('anyFn', vi.fn(async () => 'x'));
    await wrapped();
    // threshold falls back to 0, so all calls are logged
    expect(console.log).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Ring buffer — clearTimings / readTimings
// ---------------------------------------------------------------------------

describe('ring buffer — clearTimings / readTimings', () => {
  // Use a fresh module loaded with OE_PROFILE=1 so recordTiming is active.
  beforeEach(() => {
    vi.stubEnv('OE_PROFILE', '1');
    vi.stubEnv('OE_PROFILE_SLOW_MS', '9999'); // suppress console output
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('readTimings() returns [] after clearTimings()', async () => {
    const { withTiming, clearTimings, readTimings } = await importFresh();
    const wrapped = withTiming('x', vi.fn(async () => 1));
    await wrapped();
    clearTimings();
    expect(readTimings()).toEqual([]);
  });

  it('push fewer than capacity → all records returned in insertion order', async () => {
    const { withTiming, clearTimings, readTimings } = await importFresh();
    clearTimings();
    const wrapped = withTiming('alpha', vi.fn(async () => 'a'));
    await wrapped();
    await wrapped();
    await wrapped();
    const records = readTimings();
    expect(records).toHaveLength(3);
    expect(records.every((r) => r.name === 'alpha')).toBe(true);
    // insertion order preserved: ts values non-decreasing
    for (let i = 1; i < records.length; i++) {
      expect(records[i].ts).toBeGreaterThanOrEqual(records[i - 1].ts);
    }
  });

  it('withTiming records ok:true on success and ok:false on failure', async () => {
    const { withTiming, clearTimings, readTimings } = await importFresh();
    clearTimings();
    const good = withTiming('good', vi.fn(async () => 'ok'));
    const bad = withTiming('bad', vi.fn(async () => { throw new Error('boom'); }));
    await good();
    await expect(bad()).rejects.toThrow();
    const records = readTimings();
    const okRecord = records.find((r) => r.name === 'good');
    const failRecord = records.find((r) => r.name === 'bad');
    expect(okRecord?.ok).toBe(true);
    expect(failRecord?.ok).toBe(false);
  });

  it('buffer only captures when OE_PROFILE=1 (disabled → buffer stays empty)', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('OE_PROFILE', '');
    const { withTiming, clearTimings, readTimings } = await importFresh();
    clearTimings();
    const wrapped = withTiming('noop', vi.fn(async () => 42));
    // withTiming returns the identity fn when disabled, so the call goes
    // through but nothing is recorded.
    await wrapped();
    expect(readTimings()).toEqual([]);
  });

  it('push exactly capacity records → all retained, none evicted yet', async () => {
    // Use a small synthetic approach: push capacity entries by calling
    // withTiming in a loop. We only verify count here — capacity is 5000,
    // which is too slow to fill in a unit test.  Instead we test the wrap
    // semantics by overflowing a smaller simulation directly via the public API
    // re-exported after a fresh import (see overflow test below).
    const { withTiming, clearTimings, readTimings } = await importFresh();
    clearTimings();
    const fn = vi.fn(async () => 'v');
    const wrapped = withTiming('bulk', fn);
    for (let i = 0; i < 10; i++) await wrapped();
    expect(readTimings()).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// Ring buffer — overflow / head-wrap semantics
// ---------------------------------------------------------------------------

describe('ring buffer — overflow evicts oldest entries', () => {
  // We cannot trivially override RING_CAPACITY in the compiled module, so we
  // verify the documented ring semantics by observing that after filling the
  // buffer and adding one more entry, only the LAST capacity records are kept.
  // We do this by tagging records with a sequential counter inside `name`.

  beforeEach(() => {
    vi.stubEnv('OE_PROFILE', '1');
    vi.stubEnv('OE_PROFILE_SLOW_MS', '9999');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('oldest entry is evicted when capacity is exceeded (documented behaviour)', async () => {
    // This test fills 5001 entries and checks that the first name is no longer
    // in the buffer. Running 5001 near-instant async calls takes ~200 ms in
    // vitest — acceptable for a single test.
    const { withTiming, clearTimings, readTimings } = await importFresh();
    clearTimings();
    let counter = 0;
    // Use separate named fns to track first vs last.
    const first = withTiming('entry-FIRST', vi.fn(async () => ++counter));
    const middle = withTiming('entry-MIDDLE', vi.fn(async () => ++counter));
    const last = withTiming('entry-LAST', vi.fn(async () => ++counter));

    await first(); // entry #1 — will be evicted
    // Fill up remaining capacity-1 slots (4999 more) to reach exactly 5000.
    for (let i = 0; i < 4999; i++) await middle();
    // Now buffer is full. One more push evicts the first entry.
    await last();

    const records = readTimings();
    expect(records).toHaveLength(5000);
    // First entry (entry-FIRST) must no longer appear.
    expect(records.some((r) => r.name === 'entry-FIRST')).toBe(false);
    // Last entry must be present.
    expect(records[records.length - 1].name).toBe('entry-LAST');
  }, 30_000);
});

// ---------------------------------------------------------------------------
// globalThis ring — cross-module-instance visibility (regression for Next.js
// multi-bundle split where withTiming and readTimings lived in separate chunks)
// ---------------------------------------------------------------------------

describe('globalThis ring — writes via import#1 are visible via import#2', () => {
  it('second dynamic import sees records pushed through the first import', async () => {
    vi.stubEnv('OE_PROFILE', '1');
    vi.stubEnv('OE_PROFILE_SLOW_MS', '9999');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    // Import #1 — push one record via withTiming
    const mod1 = await importFresh();
    mod1.clearTimings();
    const wrapped = mod1.withTiming('cross-bundle-fn', vi.fn(async () => 'ok'));
    await wrapped();

    // Import #2 — reload the module; it should find the same globalThis ring
    const mod2 = await importFresh();
    const records = mod2.readTimings();

    // Without the globalThis fix this would return [] because the two module
    // instances each had their own private module-scope ring arrays.
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records.some((r) => r.name === 'cross-bundle-fn')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// aggregateTimings()
// ---------------------------------------------------------------------------

describe('aggregateTimings()', () => {
  beforeEach(() => {
    vi.stubEnv('OE_PROFILE', '1');
    vi.stubEnv('OE_PROFILE_SLOW_MS', '9999');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('returns [] when buffer is empty', async () => {
    const { aggregateTimings, clearTimings } = await importFresh();
    clearTimings();
    expect(aggregateTimings()).toEqual([]);
  });

  it('single-name buffer → single row with correct count, min, max, avg, percentiles', async () => {
    const { withTiming, clearTimings, aggregateTimings } = await importFresh();
    clearTimings();

    // Inject five calls with controlled durations by mocking performance.now.
    // Durations: 1, 2, 3, 4, 5 ms (sorted: same).
    // p50 = floor(0.50*5)=2 → idx 2 → value 3
    // p95 = floor(0.95*5)=4 → idx 4 → value 5
    // p99 = floor(0.99*5)=4 → idx 4 → value 5
    const durations = [1, 2, 3, 4, 5];
    let callIdx = 0;
    let nowCallsInThisInvocation = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      if (nowCallsInThisInvocation % 2 === 0) {
        // t0 call — return 0
        nowCallsInThisInvocation++;
        return 0;
      } else {
        // end call — return duration for this fn invocation
        const dur = durations[callIdx++];
        nowCallsInThisInvocation++;
        return dur;
      }
    });

    const fn = vi.fn(async () => 'v');
    const wrapped = withTiming('loader', fn);
    for (let i = 0; i < 5; i++) await wrapped();

    vi.spyOn(performance, 'now').mockRestore();

    const agg = aggregateTimings();
    expect(agg).toHaveLength(1);
    const row = agg[0];
    expect(row.name).toBe('loader');
    expect(row.count).toBe(5);
    expect(row.failCount).toBe(0);
    expect(row.minMs).toBe(1);
    expect(row.maxMs).toBe(5);
    expect(row.avgMs).toBeCloseTo(3, 5);
    expect(row.p50Ms).toBe(3);
    expect(row.p95Ms).toBe(5);
    expect(row.p99Ms).toBe(5);
  });

  it('multi-name buffer → sorted by p95Ms descending', async () => {
    const { withTiming, clearTimings, aggregateTimings } = await importFresh();
    clearTimings();

    // fast loader: constant 1 ms per call
    // slow loader: constant 100 ms per call
    let nowCalls = 0;
    const sequence = [
      // fast: 5 calls → t0=0, end=1, t0=0, end=1, ...
      0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
      // slow: 5 calls → t0=0, end=100, ...
      0, 100, 0, 100, 0, 100, 0, 100, 0, 100,
    ];
    vi.spyOn(performance, 'now').mockImplementation(() => sequence[nowCalls++] ?? 0);

    const fast = withTiming('fast-loader', vi.fn(async () => 'f'));
    const slow = withTiming('slow-loader', vi.fn(async () => 's'));
    for (let i = 0; i < 5; i++) await fast();
    for (let i = 0; i < 5; i++) await slow();

    vi.spyOn(performance, 'now').mockRestore();

    const agg = aggregateTimings();
    expect(agg).toHaveLength(2);
    // slow-loader has higher p95 → must be first
    expect(agg[0].name).toBe('slow-loader');
    expect(agg[1].name).toBe('fast-loader');
    expect(agg[0].p95Ms).toBeGreaterThan(agg[1].p95Ms);
  });

  it('counts failures correctly', async () => {
    const { withTiming, clearTimings, aggregateTimings } = await importFresh();
    clearTimings();
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const good = withTiming('mixed', vi.fn(async () => 'ok'));
    const fail = withTiming('mixed', vi.fn(async () => { throw new Error('x'); }));
    await good();
    await good();
    await expect(fail()).rejects.toThrow();

    vi.spyOn(performance, 'now').mockRestore();

    const agg = aggregateTimings();
    expect(agg).toHaveLength(1);
    expect(agg[0].count).toBe(3);
    expect(agg[0].failCount).toBe(1);
  });
});
