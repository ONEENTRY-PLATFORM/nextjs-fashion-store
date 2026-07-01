/**
 * Currency configuration — symbol, code, formatting.
 * All currency display goes through this. When CMS comes online,
 * the symbol/code switches centrally.
 */
export const CURRENCY = {
  symbol: '$',
  code: 'USD',
  /** Display with up to two decimals, trailing zeros stripped:
   *  $35 (was $35.00), $35.5 (was $35.50), $35.99 stays. */
  format: (n: number) => {
    const fixed = n.toFixed(2);
    return `$${fixed.replace(/\.?0+$/, '')}`;
  },
  /** Strip currency symbol and thousand separators for parsing */
  strip: (s: string) => s.replace('$', '').replace(',', ''),
  /** Render symbol followed by integer amount: $10 */
  formatInteger: (n: number) => `$${n}`,
} as const;
