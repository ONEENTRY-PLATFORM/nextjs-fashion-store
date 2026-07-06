/**
 * Tests for withTiming() in profiling.ts.
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
