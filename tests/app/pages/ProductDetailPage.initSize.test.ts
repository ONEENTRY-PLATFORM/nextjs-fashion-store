/**
 * Unit tests for the `initSize` derivation used by ProductDetailPage.
 *
 * The logic under test (verbatim from ProductDetailPage.tsx line 203-204):
 *
 *   const initSize =
 *     searchParams?.get('size')
 *     ?? (productSizeOptions.length === 1 ? productSizeOptions[0].label : null);
 *
 * This is a pure expression — tested here without mounting the component.
 */
import { describe, it, expect } from 'vitest';

type SizeOption = { label: string; available: boolean };

/** Mirrors the exact derivation in ProductDetailPage.tsx */
function resolveInitSize(
  sizeParam: string | null,
  sizeOptions: SizeOption[],
): string | null {
  return sizeParam ?? (sizeOptions.length === 1 ? sizeOptions[0].label : null);
}

describe('initSize derivation', () => {
  it('returns the sole size label when exactly one sizeOption and no ?size= param', () => {
    expect(resolveInitSize(null, [{ label: 'One Size', available: true }])).toBe('One Size');
  });

  it('returns ?size= param value even when there is exactly one sizeOption', () => {
    expect(
      resolveInitSize('XL', [{ label: 'One Size', available: true }]),
    ).toBe('XL');
  });

  it('returns null when sizeOptions is empty and no param', () => {
    expect(resolveInitSize(null, [])).toBeNull();
  });

  it('returns null when there are multiple sizeOptions and no param', () => {
    const opts: SizeOption[] = [
      { label: 'S', available: true },
      { label: 'M', available: true },
      { label: 'L', available: false },
    ];
    expect(resolveInitSize(null, opts)).toBeNull();
  });

  it('returns param even when sizeOptions is empty', () => {
    expect(resolveInitSize('M', [])).toBe('M');
  });

  it('returns param when there are multiple sizeOptions', () => {
    const opts: SizeOption[] = [
      { label: 'S', available: true },
      { label: 'M', available: true },
    ];
    expect(resolveInitSize('S', opts)).toBe('S');
  });
});
