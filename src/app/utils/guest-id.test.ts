/**
 * Unit tests for guest-id helpers.
 *
 * Vitest's jsdom environment provides localStorage, so no manual mocking
 * is needed for the happy path. We clear storage before each test to
 * guarantee isolation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearGuestId, getOrCreateGuestId, readGuestId } from './guest-id';

const KEY = 'oe_guest_id';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe('getOrCreateGuestId', () => {
  it('mints a new id on first call and persists it', () => {
    const id = getOrCreateGuestId();
    expect(id).toMatch(/^guest-/);
    expect(localStorage.getItem(KEY)).toBe(id);
  });

  it('returns the same id on subsequent calls (no re-mint)', () => {
    const first = getOrCreateGuestId();
    const second = getOrCreateGuestId();
    expect(second).toBe(first);
  });
});

describe('readGuestId', () => {
  it('returns undefined when nothing is stored', () => {
    expect(readGuestId()).toBeUndefined();
  });

  it('returns the previously persisted value', () => {
    const id = getOrCreateGuestId();
    expect(readGuestId()).toBe(id);
  });
});

describe('clearGuestId', () => {
  it('removes the stored id so readGuestId returns undefined afterwards', () => {
    getOrCreateGuestId(); // sets a value
    clearGuestId();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(readGuestId()).toBeUndefined();
  });

  it('does not throw when localStorage.removeItem throws (e.g. private mode)', () => {
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => clearGuestId()).not.toThrow();
  });
});
