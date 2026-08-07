import { describe, it, expect } from 'vitest';
import {
  SIZE_GUIDE_DATA,
  parseSizeGuide,
  serializeSizeGuide,
  parseSizeTable,
} from '@/app/data/sizeGuide';

const COLS = ['size', 'chest'] as const;
type Row = Record<(typeof COLS)[number], string>;
const FALLBACK: readonly Row[] = [{ size: 'S', chest: '84' }];

describe('parseSizeGuide', () => {
  it('falls back to the coded chart when the CMS value is absent', () => {
    expect(parseSizeGuide(undefined)).toBe(SIZE_GUIDE_DATA);
    expect(parseSizeGuide('')).toBe(SIZE_GUIDE_DATA);
  });

  it('reads a pipe-separated chart authored in the admin panel', () => {
    const rows = parseSizeGuide('XS|0-2|31"|24"|33"\nS|4-6|33"|26"|35"');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({ size: 'S', us: '4-6', bust: '33"', waist: '26"', hip: '35"' });
  });

  it('round-trips through serialize', () => {
    expect(parseSizeGuide(serializeSizeGuide(SIZE_GUIDE_DATA))).toEqual(SIZE_GUIDE_DATA);
  });
});

describe('parseSizeTable', () => {
  it('drops a row with the wrong column count instead of rendering blanks', () => {
    const rows = parseSizeTable<Row>('M|88\nBROKEN\nL|92|extra', COLS, FALLBACK);
    expect(rows).toEqual([{ size: 'M', chest: '88' }]);
  });

  it('drops a row with an empty cell', () => {
    expect(parseSizeTable<Row>('M|', COLS, FALLBACK)).toBe(FALLBACK);
  });

  it('ignores blank lines and surrounding whitespace', () => {
    const rows = parseSizeTable<Row>('\n  M | 88 \n\n', COLS, FALLBACK);
    expect(rows).toEqual([{ size: 'M', chest: '88' }]);
  });

  it('falls back when nothing parses, so the guide is never empty', () => {
    expect(parseSizeTable<Row>('nonsense', COLS, FALLBACK)).toBe(FALLBACK);
  });

  it('accepts CRLF, which is what a Windows editor pastes', () => {
    expect(parseSizeTable<Row>('M|88\r\nL|92', COLS, FALLBACK)).toHaveLength(2);
  });
});
