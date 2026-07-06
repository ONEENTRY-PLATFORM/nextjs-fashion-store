/**
 * ISR (Incremental Static Regeneration) TTL config.
 *
 * Every page exports `revalidate` from here so all cache windows live in one
 * place. Each constant can be overridden per-environment via `.env`
 * (`ISR_<NAME>_TTL_SEC=<seconds>`) — useful for staging where you want a
 * shorter window than production, or for tuning after profiling.
 *
 * Available env overrides (all optional):
 *   ISR_HOME_TTL_SEC     — homepage HTML   (default 300 = 5 min)
 *   ISR_PRODUCT_TTL_SEC  — product detail  (default 120 = 2 min)
 *   ISR_CATALOG_TTL_SEC  — catalog listing (default 60  = 1 min)
 *   ISR_SALE_TTL_SEC     — sale page       (default 60)
 *   ISR_NEW_TTL_SEC      — new arrivals    (default 600 = 10 min)
 *   ISR_STORES_TTL_SEC   — store locator   (default 3600 = 60 min)
 *   ISR_INFO_TTL_SEC     — info pages      (default 3600 = 60 min)
 *   ISR_DISABLED=1       — bypass ISR entirely (each request re-fetches from OE)
 *
 * The env check runs at module load, so the value is a constant Next.js can
 * statically analyse (it must be, otherwise the framework falls back to
 * dynamic rendering and the whole point is lost).
 *
 * When disabled we emit `1` (not `0`) because these constants are also fed
 * to `unstable_cache({ revalidate })`, which rejects `0` at runtime with
 * "Invariant revalidate: 0 can not be passed to unstable_cache()". A 1 s
 * window is functionally equivalent to disabled for a human clicking around.
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

/** Homepage blocks. Fresh enough for catalog changes, cheap for OE. */
export const REVALIDATE_HOME    = ttl('ISR_HOME_TTL_SEC',    300);
/** PDP: shorter window because stale price / stock can turn into a paid stale
 *  order. Checkout's pre-flight `previewOrder` is the belt-and-braces guard. */
export const REVALIDATE_PRODUCT = ttl('ISR_PRODUCT_TTL_SEC', 120);
/** Catalog listings (women/men/*) — clean URLs only; filter/sort/page URLs
 *  still SSR each request (`dynamic = 'auto'`). */
export const REVALIDATE_CATALOG = ttl('ISR_CATALOG_TTL_SEC',  60);
/** Sale page (time-sensitive banners, countdown, discount %). */
export const REVALIDATE_SALE    = ttl('ISR_SALE_TTL_SEC',     60);
/** New arrivals. */
export const REVALIDATE_NEW     = ttl('ISR_NEW_TTL_SEC',     600);
/** Store locator (stores barely change). */
export const REVALIDATE_STORES  = ttl('ISR_STORES_TTL_SEC', 3600);
/** Info pages (about, faq, policies, sitemap-driven). */
export const REVALIDATE_INFO    = ttl('ISR_INFO_TTL_SEC',   3600);
