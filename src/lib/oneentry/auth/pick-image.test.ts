/**
 * Unit tests for the exported `pickImage` helper (src/lib/oneentry/auth/actions.ts).
 *
 * `pickImage` is a pure function — no SDK, no network, no Next.js plumbing
 * required. We import it in isolation by mocking every module that actions.ts
 * pulls in at the top level so the `'use server'` boundary never fires.
 */
import { describe, expect, it, vi } from 'vitest';

// ── Stub every side-effectful import that actions.ts touches at module load ──

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

vi.mock('../index', () => ({
  oneentry: { AuthProvider: {}, Users: {}, Orders: {} },
  isOneEntryEnabled: false,
  isError: vi.fn(() => false),
  getUserApi: vi.fn(() => null),
  getGuestApi: vi.fn(() => null),
}));

vi.mock('../catalog/products', () => ({
  loadProductsByIds: vi.fn(async () => []),
}));

vi.mock('../locale', () => ({
  DEFAULT_LOCALE: 'en_US',
}));

// ── Import after mocks are registered ────────────────────────────────────────

import { pickImage } from './pick-image';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('pickImage', () => {
  it('returns downloadLink from a single-element array', () => {
    expect(pickImage([{ downloadLink: 'x' }])).toBe('x');
  });

  it('returns previewLink when downloadLink is absent', () => {
    expect(pickImage([{ previewLink: 'y' }])).toBe('y');
  });

  it('prefers downloadLink over previewLink', () => {
    expect(pickImage([{ downloadLink: 'x', previewLink: 'y' }])).toBe('x');
  });

  it('handles a bare object (non-array) — returns downloadLink', () => {
    expect(pickImage({ downloadLink: 'x' })).toBe('x');
  });

  it('returns empty string for null', () => {
    expect(pickImage(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pickImage(undefined)).toBe('');
  });

  it('returns empty string for an empty array', () => {
    expect(pickImage([])).toBe('');
  });

  it('returns empty string when the first element has no recognised link fields', () => {
    expect(pickImage([{}])).toBe('');
  });
});
