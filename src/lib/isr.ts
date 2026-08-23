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

/** Segment window for the homepage and the other editor-driven surfaces. */
export const REVALIDATE_HOME = ttl('ISR_HOME_TTL_SEC', 300);
/**
 * CMS blocks (hero, collections, discount banner, category section, product blocks).
 *
 * Longer than the homepage window on purpose. A page expires with the shortest cache it reads, and
 * these blocks are read by both the homepage — 2 URLs, cheap to regenerate — and every PDP, of
 * which there are hundreds; on the homepage window the blocks pinned all of them to 5 minutes.
 * The homepage still refreshes on its own 5-minute segment window regardless of this value.
 *
 * Raise `ISR_BLOCK_TTL_SEC` to 1800 to match the PDP window if editors can wait half an hour to
 * see a block change.
 */
export const REVALIDATE_BLOCK = ttl('ISR_BLOCK_TTL_SEC', 900);
/**
 * PDP loaders. Was 120 s "because stale price / stock can turn into a paid stale order", but that
 * traded a rare, recoverable staleness for a permanent one: every crawler pass past the window
 * rewrote each product page on Vercel's ISR store. Order placement still drops the `oe-products`
 * tag immediately (`auth/revalidate-action.ts`), which is the path that actually protects a sale.
 */
export const REVALIDATE_PRODUCT = ttl('ISR_PRODUCT_TTL_SEC', 1800);
/** Catalog product lists and the editorial storefront pages built on them (`/new`, `/sale`). */
export const REVALIDATE_CATALOG = ttl('ISR_CATALOG_TTL_SEC', 600);
/**
 * Site structure — the category tree and the info-page slugs.
 *
 * Its own window because it sits on the PDP render path (breadcrumbs) while changing only when an
 * editor adds a page. A page expires with the shortest cache it reads, so leaving this on the
 * catalog window would have pulled every product page back down to it.
 */
export const REVALIDATE_STRUCTURE = ttl('ISR_STRUCTURE_TTL_SEC', 1800);
/** Store locator + checkout delivery methods / schedule (rarely change). */
export const REVALIDATE_STORES = ttl('ISR_STORES_TTL_SEC', 3600);
