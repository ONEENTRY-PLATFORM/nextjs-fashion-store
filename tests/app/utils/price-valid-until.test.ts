import { afterEach, describe, expect, it, vi } from 'vitest';

import { priceValidUntil } from '@/app/utils/price-valid-until';

afterEach(() => {
  vi.useRealTimers();
});

describe('priceValidUntil', () => {
  it('returns a schema.org date 30 days out by default', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    expect(priceValidUntil()).toBe('2026-01-31');
  });

  it('honours a custom window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    expect(priceValidUntil(1)).toBe('2026-01-02');
    expect(priceValidUntil(0)).toBe('2026-01-01');
  });

  it('crosses month and year boundaries correctly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-20T00:00:00.000Z'));
    expect(priceValidUntil(30)).toBe('2027-01-19');
  });

  it('emits YYYY-MM-DD, never a full ISO timestamp', () => {
    expect(priceValidUntil()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
