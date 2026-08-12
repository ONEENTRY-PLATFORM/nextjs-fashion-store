/**
 * Currency configuration — symbol, code, formatting.
 *
 * All currency display goes through this module. The live pair comes from the
 * OneEntry `site_settings` set (`site_settings_currency_code` /
 * `site_settings_currency_symbol`); {@link CURRENCY_FALLBACK} is the shipped
 * default used when the CMS is unreachable or the fields are blank.
 *
 * Why a mutable module slot rather than a React context: prices are formatted
 * from plain functions on both runtimes — `adaptCatalogProductToUiProduct`
 * turns OE numbers into display strings inside a server loader, and a handful
 * of client widgets format on the fly — and neither can call a hook. Each
 * runtime therefore seeds its own copy once from the same CMS read: the server
 * inside {@link getSiteSettings}, the browser inside `<Providers>`. The slot is
 * write-once-per-value and never read before it is seeded in a way that could
 * differ between the two, so server HTML and client render agree.
 */

/** Shipped default, used until (and if) the CMS supplies its own pair. */
export const CURRENCY_FALLBACK = { symbol: '$', code: 'USD' } as const;

/** The pair currently in force for this runtime. */
let active: { symbol: string; code: string } = { ...CURRENCY_FALLBACK };

/**
 * Install the CMS-configured currency for this runtime.
 *
 * Blank or missing fields leave the current value untouched, so a half-filled
 * admin panel degrades field by field rather than wiping the symbol.
 *
 * @param next        - Partial pair from the CMS.
 * @param next.symbol - Currency symbol, e.g. `$`.
 * @param next.code   - ISO 4217 code, e.g. `USD`.
 */
export function configureCurrency(next: { symbol?: string | null; code?: string | null }): void {
  const symbol = typeof next.symbol === 'string' ? next.symbol.trim() : '';
  const code = typeof next.code === 'string' ? next.code.trim() : '';
  active = {
    symbol: symbol.length > 0 ? symbol : active.symbol,
    code: code.length > 0 ? code : active.code,
  };
}

/**
 * Currency accessors and formatters.
 *
 * `symbol` and `code` are getters, not frozen values: a module that reads them
 * at import time (before {@link configureCurrency} runs) would otherwise pin
 * the fallback for the process lifetime.
 */
export const CURRENCY = {
  get symbol(): string {
    return active.symbol;
  },
  get code(): string {
    return active.code;
  },
  /**
   * Display with up to two decimals, trailing zeros stripped:
   *  $35 (was $35.00), $35.5 (was $35.50), $35.99 stays.
   */
  format: (n: number) => {
    const fixed = n.toFixed(2);
    return `${active.symbol}${fixed.replace(/\.?0+$/, '')}`;
  },
  /**
   * Strip currency symbol and thousand separators for parsing
   */
  strip: (s: string) => s.split(active.symbol).join('').replace(',', ''),
  /**
   * Render symbol followed by integer amount: $10
   */
  formatInteger: (n: number) => `${active.symbol}${n}`,
} as const;
