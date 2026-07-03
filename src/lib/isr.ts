/**
 * ISR (Incremental Static Regeneration) TTL config.
 *
 * Every page exports `revalidate` from here so all cache windows live in one
 * place. Set `ISR_DISABLED=1` in `.env.local` during development to bypass
 * the cache entirely (each request re-fetches from OE) — no need to wait
 * 5 minutes to see a content change.
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

/** 5 min — homepage blocks. Fresh enough for catalog changes, cheap for OE. */
export const REVALIDATE_HOME = disabled ? 1 : 300;
/** 10 min — PDP: product content, price, stock all rarely change intra-day. */
export const REVALIDATE_PRODUCT = disabled ? 1 : 600;
/** 5 min — catalog listings (women/men/*). */
export const REVALIDATE_CATALOG = disabled ? 1 : 300;
/** 60 s — sale page (time-sensitive banners, countdown, discount %). */
export const REVALIDATE_SALE = disabled ? 1 : 60;
/** 10 min — new arrivals. */
export const REVALIDATE_NEW = disabled ? 1 : 600;
/** 60 min — store locator (stores barely change). */
export const REVALIDATE_STORES = disabled ? 1 : 3600;
/** 60 min — info pages (about, faq, policies, sitemap-driven). */
export const REVALIDATE_INFO = disabled ? 1 : 3600;
