/** OE data-cache TTL config. */
const disabled = process.env.ISR_DISABLED === '1';

/** Parse a positive integer env override. */
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
export const REVALIDATE_HOME = ttl('ISR_HOME_TTL_SEC', 300);
/** PDP loaders: shorter window because stale price / stock can turn into a paid stale order. */
export const REVALIDATE_PRODUCT = ttl('ISR_PRODUCT_TTL_SEC', 120);
/** Catalog product lists, purchase bonuses, product discounts. */
export const REVALIDATE_CATALOG = ttl('ISR_CATALOG_TTL_SEC', 60);
/** Store locator + checkout delivery methods / schedule (rarely change). */
export const REVALIDATE_STORES = ttl('ISR_STORES_TTL_SEC', 3600);
