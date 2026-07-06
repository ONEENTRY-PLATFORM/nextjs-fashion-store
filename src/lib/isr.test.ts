/**
 * Tests for the `_ttl` helper exported from isr.ts.
 *
 * Because `_ttl` reads `process.env` lazily (each call checks the env key)
 * but reads `disabled` (ISR_DISABLED) at module load, we use vi.stubEnv to
 * control the per-call env key, and vi.resetModules + re-import to control
 * the `disabled` flag.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Re-import isr.ts so `disabled` is re-evaluated with current env. */
const importFresh = async () => {
  vi.resetModules();
  return import('./isr');
};

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// ISR_DISABLED branch
// ---------------------------------------------------------------------------

describe('_ttl — ISR_DISABLED=1', () => {
  beforeEach(() => {
    vi.stubEnv('ISR_DISABLED', '1');
  });

  it('returns 1 regardless of the env key value', async () => {
    vi.stubEnv('ISR_HOME_TTL_SEC', '600');
    const { _ttl } = await importFresh();
    expect(_ttl('ISR_HOME_TTL_SEC', 300)).toBe(1);
  });

  it('returns 1 even when env key is unset', async () => {
    const { _ttl } = await importFresh();
    expect(_ttl('ISR_HOME_TTL_SEC', 300)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Normal branch (ISR_DISABLED not set)
// ---------------------------------------------------------------------------

describe('_ttl — ISR_DISABLED not set', () => {
  beforeEach(() => {
    // Ensure the flag is absent so `disabled === false`
    vi.stubEnv('ISR_DISABLED', '');
  });

  it('returns fallback when env key is unset', async () => {
    const { _ttl } = await importFresh();
    expect(_ttl('ISR_HOME_TTL_SEC', 300)).toBe(300);
  });

  it('returns fallback when env key is empty string', async () => {
    vi.stubEnv('ISR_HOME_TTL_SEC', '');
    const { _ttl } = await importFresh();
    expect(_ttl('ISR_HOME_TTL_SEC', 300)).toBe(300);
  });

  it('returns parsed integer for a valid positive value', async () => {
    vi.stubEnv('ISR_HOME_TTL_SEC', '120');
    const { _ttl } = await importFresh();
    expect(_ttl('ISR_HOME_TTL_SEC', 300)).toBe(120);
  });

  it('returns fallback when env value is 0', async () => {
    vi.stubEnv('ISR_HOME_TTL_SEC', '0');
    const { _ttl } = await importFresh();
    expect(_ttl('ISR_HOME_TTL_SEC', 300)).toBe(300);
  });

  it('returns fallback when env value is negative', async () => {
    vi.stubEnv('ISR_HOME_TTL_SEC', '-5');
    const { _ttl } = await importFresh();
    expect(_ttl('ISR_HOME_TTL_SEC', 300)).toBe(300);
  });

  it('returns fallback when env value is non-numeric', async () => {
    vi.stubEnv('ISR_HOME_TTL_SEC', 'abc');
    const { _ttl } = await importFresh();
    expect(_ttl('ISR_HOME_TTL_SEC', 300)).toBe(300);
  });

  it('parses leading-integer strings (parseInt behaviour)', async () => {
    // parseInt('60abc', 10) === 60 — this is intentional parseInt semantics
    vi.stubEnv('ISR_HOME_TTL_SEC', '60abc');
    const { _ttl } = await importFresh();
    expect(_ttl('ISR_HOME_TTL_SEC', 300)).toBe(60);
  });
});
