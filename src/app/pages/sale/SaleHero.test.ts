import { describe, expect, it, vi } from 'vitest';

// parseHeroPlain reads SALE_PAGE_LABELS at import time — mock before importing.
vi.mock('../../data/salePageLabels', () => ({
  SALE_PAGE_LABELS: {
    heroTitleLine1: 'SEASON',
    heroTitleLine2: 'SALE',
    heroUpTo: 'UP TO',
    heroPercent: '50%',
    heroOff: 'OFF',
    heroSubtitle: 'Major markdowns across clothing, shoes, bags, and accessories.',
  },
}));

// SaleHero imports next/image and lucide-react — stub them so vitest doesn't
// try to resolve the Next.js image pipeline or ESM-only icon packages.
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('lucide-react', () => ({ Tag: () => null, ChevronRight: () => null }));
vi.mock('./SaleCountdown', () => ({ CountdownUnit: () => null }));
vi.mock('../../../lib/oneentry/labels/SalePageLabelsContext', () => ({
  useSalePageT: (_key: string, fallback: string) => fallback,
}));

const { parseHeroPlain } = await import('./SaleHero');

// ---------------------------------------------------------------------------
describe('parseHeroPlain — full 4-line input', () => {
  it('splits into titleLine1, titleLine2, discount, subtitle', () => {
    const result = parseHeroPlain('SEASON\nSALE\nUP TO 50% OFF\nMajor markdowns...');
    expect(result.titleLine1).toBe('SEASON');
    expect(result.titleLine2).toBe('SALE');
    expect(result.discount).toEqual({ prefix: 'UP TO', percent: '50%', suffix: 'OFF' });
    expect(result.subtitle).toBe('Major markdowns...');
  });

  it('joins multiple subtitle lines (line 4+) with a space', () => {
    const result = parseHeroPlain('A\nB\nC 10% D\nFirst subtitle line\nSecond subtitle line');
    expect(result.subtitle).toBe('First subtitle line Second subtitle line');
  });
});

// ---------------------------------------------------------------------------
describe('parseHeroPlain — empty / blank input → all L.* fallbacks', () => {
  it('returns all defaults when plain is empty string', () => {
    const result = parseHeroPlain('');
    expect(result.titleLine1).toBe('SEASON');
    expect(result.titleLine2).toBe('SALE');
    expect(result.discount).toEqual({ prefix: 'UP TO', percent: '50%', suffix: 'OFF' });
    expect(result.subtitle).toBe('Major markdowns across clothing, shoes, bags, and accessories.');
  });

  it('returns all defaults when plain is only whitespace / blank lines', () => {
    const result = parseHeroPlain('   \n\n  ');
    expect(result.titleLine1).toBe('SEASON');
    expect(result.titleLine2).toBe('SALE');
    expect(result.discount).toEqual({ prefix: 'UP TO', percent: '50%', suffix: 'OFF' });
  });
});

// ---------------------------------------------------------------------------
describe('parseHeroPlain — partial inputs', () => {
  it('falls back to L.heroTitleLine2 when only one line is provided', () => {
    const result = parseHeroPlain('SUMMER');
    expect(result.titleLine1).toBe('SUMMER');
    expect(result.titleLine2).toBe('SALE');
  });

  it('uses L.* discount defaults when only two title lines are provided', () => {
    const result = parseHeroPlain('SUMMER\nCOLLECTION');
    expect(result.discount).toEqual({ prefix: 'UP TO', percent: '50%', suffix: 'OFF' });
    expect(result.subtitle).toBe('');
  });

  it('returns empty subtitle when exactly three lines (no line 4+)', () => {
    const result = parseHeroPlain('A\nB\nSave 20% now');
    expect(result.subtitle).toBe('');
  });
});

// ---------------------------------------------------------------------------
describe('parseHeroPlain — discount line parsing', () => {
  it('extracts prefix, percent, suffix from a well-formed discount line', () => {
    const { discount } = parseHeroPlain('T1\nT2\nUP TO 50% OFF');
    expect(discount).toEqual({ prefix: 'UP TO', percent: '50%', suffix: 'OFF' });
  });

  it('handles a discount line with no prefix (leading percent)', () => {
    const { discount } = parseHeroPlain('T1\nT2\n30% OFF EVERYTHING');
    expect(discount).toEqual({ prefix: '', percent: '30%', suffix: 'OFF EVERYTHING' });
  });

  it('handles a discount line with no suffix (trailing percent)', () => {
    const { discount } = parseHeroPlain('T1\nT2\nSAVE 70%');
    expect(discount).toEqual({ prefix: 'SAVE', percent: '70%', suffix: '' });
  });

  it('uses entire line as prefix when no NN% pattern is present', () => {
    const { discount } = parseHeroPlain('T1\nT2\nSomething bold');
    expect(discount).toEqual({ prefix: 'Something bold', percent: '', suffix: '' });
  });

  it('trims whitespace around prefix and suffix', () => {
    const { discount } = parseHeroPlain('T1\nT2\n  UP TO   40%   SAVINGS  ');
    expect(discount.prefix).toBe('UP TO');
    expect(discount.percent).toBe('40%');
    expect(discount.suffix).toBe('SAVINGS');
  });
});

// ---------------------------------------------------------------------------
describe('parseHeroPlain — line trimming', () => {
  it('trims surrounding whitespace from each line', () => {
    const result = parseHeroPlain('  SEASON  \n  SALE  \n  UP TO 50% OFF  \n  Subtitle  ');
    expect(result.titleLine1).toBe('SEASON');
    expect(result.titleLine2).toBe('SALE');
    expect(result.discount.suffix).toBe('OFF');
    expect(result.subtitle).toBe('Subtitle');
  });

  it('ignores blank lines between content lines', () => {
    const result = parseHeroPlain('SEASON\n\nSALE\n\nUP TO 50% OFF\n\nSubtitle');
    expect(result.titleLine1).toBe('SEASON');
    expect(result.titleLine2).toBe('SALE');
    expect(result.discount.percent).toBe('50%');
    expect(result.subtitle).toBe('Subtitle');
  });

  it('handles CRLF line endings', () => {
    const result = parseHeroPlain('SEASON\r\nSALE\r\nUP TO 50% OFF\r\nSubtitle');
    expect(result.titleLine1).toBe('SEASON');
    expect(result.titleLine2).toBe('SALE');
    expect(result.discount.percent).toBe('50%');
    expect(result.subtitle).toBe('Subtitle');
  });
});
