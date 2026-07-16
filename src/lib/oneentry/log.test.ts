/**
 * Tests for logCaught() in log.ts.
 *
 * `enabled` is computed at module top-level from process.env, so each branch
 * requires vi.stubEnv + vi.resetModules + a fresh dynamic import.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const importFresh = async () => {
  vi.resetModules();
  return import('./log');
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// In Vitest NODE_ENV defaults to 'test', so `enabled` is true by default.
// We need to force NODE_ENV='production' and clear the opt-in vars to test
// the silent path.

describe('logCaught — production, no opt-in flags (silent)', () => {
  it('does NOT call console.warn', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('OE_LOG_CAUGHT', '');
    vi.stubEnv('OE_PROFILE', '');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { logCaught } = await importFresh();

    logCaught('test-scope', new Error('boom'));

    expect(warn).not.toHaveBeenCalled();
  });
});

describe('logCaught — non-production (NODE_ENV=test, Vitest default)', () => {
  it('calls console.warn with the expected message', async () => {
    // NODE_ENV is already 'test' in Vitest; no stub needed.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = new Error('network error');
    const { logCaught } = await importFresh();

    logCaught('my-scope', err);

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith('[oe] my-scope swallowed:', err);
  });
});

describe('logCaught — production + OE_LOG_CAUGHT=1 (opt-in)', () => {
  it('calls console.warn even in production when OE_LOG_CAUGHT is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('OE_LOG_CAUGHT', '1');
    vi.stubEnv('OE_PROFILE', '');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = new Error('oops');
    const { logCaught } = await importFresh();

    logCaught('catch-scope', err);

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith('[oe] catch-scope swallowed:', err);
  });
});
