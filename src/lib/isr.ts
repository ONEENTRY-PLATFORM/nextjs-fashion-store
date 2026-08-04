/**
 * OE data-cache TTL config.
 *
 * These constants are consumed **only** by `unstable_cache({ revalidate })`
 * inside the OneEntry loaders — they are not route-segment config. Route
 * shells must declare `export const revalidate` as a plain literal, because
 * Next.js AST-parses segment config at build time and rejects imported or
 * computed values with "Invalid segment configuration export detected"
 * (`app/page.tsx` → 300, `app/product/[id]/page.tsx` → 120,
 * `app/[...slug]/page.tsx` → 60, `app/stores/page.tsx` → 3600). So tuning
 * the env overrides below changes how long loader responses are reused, not
 * how long the page HTML stays cached.
 *
 * Available env overrides (all optional):
 *   ISR_HOME_TTL_SEC     — homepage blocks  (default 300 = 5 min)
 *   ISR_PRODUCT_TTL_SEC  — product detail   (default 120 = 2 min)
 *   ISR_CATALOG_TTL_SEC  — catalog listing  (default 60  = 1 min)
 *   ISR_STORES_TTL_SEC   — stores / forms   (default 3600 = 60 min)
 *   ISR_DISABLED=1       — collapse every window to 1 s (re-fetch per request)
 *
 * Only knobs with a live consumer are kept here. A constant nothing imports
 * is a knob that silently does nothing when turned — SALE / NEW / INFO were
 * exactly that and were removed; `/sale` and `/new` loaders hold their own
 * literal `revalidate: 60`.
 *
 * When disabled we emit `1` (not `0`) because `unstable_cache` rejects `0`
 * at runtime with "Invariant revalidate: 0 can not be passed to
 * unstable_cache()". A 1 s window is functionally equivalent to disabled for
 * a human clicking around.
 */
const disabled = process.env.ISR_DISABLED === '1';

/** Parse a positive integer env override; fall back to `fallback` when the
 *  env var is unset, empty, or not a positive number.
 *
 *  Exported with an underscore prefix for unit-testing purposes only — not
 *  part of the public API. */
export function _ttl(envKey: string, fallback: number): number {
  if (disabled) return 1;
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Internal alias kept for readability at the call sites below.
const ttl = _ttl;

/** Homepage blocks (hero, collections, discount banner, category section). */
export const REVALIDATE_HOME    = ttl('ISR_HOME_TTL_SEC',    300);
/** PDP loaders: shorter window because stale price / stock can turn into a
 *  paid stale order. Checkout's pre-flight `previewOrder` is the
 *  belt-and-braces guard. */
export const REVALIDATE_PRODUCT = ttl('ISR_PRODUCT_TTL_SEC', 120);
/** Catalog product lists, purchase bonuses, product discounts. */
export const REVALIDATE_CATALOG = ttl('ISR_CATALOG_TTL_SEC',  60);
/** Store locator + checkout delivery methods / schedule (rarely change). */
export const REVALIDATE_STORES  = ttl('ISR_STORES_TTL_SEC', 3600);
