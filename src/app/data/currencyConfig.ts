/** Currency configuration — symbol, code, formatting. */

/** Shipped default, used until (and if) the CMS supplies its own pair. */
export const CURRENCY_FALLBACK = { symbol: '$', code: 'USD' } as const;

/** The pair currently in force for this runtime. */
let active: { symbol: string; code: string } = { ...CURRENCY_FALLBACK };

/** Install the CMS-configured currency for this runtime. */
export function configureCurrency(next: { symbol?: string | null; code?: string | null }): void {
  const symbol = typeof next.symbol === 'string' ? next.symbol.trim() : '';
  const code = typeof next.code === 'string' ? next.code.trim() : '';
  active = {
    symbol: symbol.length > 0 ? symbol : active.symbol,
    code: code.length > 0 ? code : active.code,
  };
}

/** Currency accessors and formatters. */
export const CURRENCY = {
  get symbol(): string {
    return active.symbol;
  },
  get code(): string {
    return active.code;
  },
  /** Display with up to two decimals, trailing zeros stripped: $35 (was $35.00), $35.5 (was $35.50), $35.99 stays. */
  format: (n: number) => {
    const fixed = n.toFixed(2);
    return `${active.symbol}${fixed.replace(/\.?0+$/, '')}`;
  },
  /** Strip currency symbol and thousand separators for parsing */
  strip: (s: string) => s.split(active.symbol).join('').replace(',', ''),
  /** Render symbol followed by integer amount: $10 */
  formatInteger: (n: number) => `${active.symbol}${n}`,
} as const;
