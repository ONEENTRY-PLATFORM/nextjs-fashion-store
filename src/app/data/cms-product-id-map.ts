/**
 * Product id helpers between the UI-facing string form (`item.id`) and the
 * OneEntry numeric `products.id` used by the server (`/me/cart`, activity
 * tracking, wishlist sync).
 *
 * Historical note: this file used to hold a manual `wc-1 → 1` mapping table
 * between playground mock ids and a local Platform seed DB. That table was
 * removed together with the static product catalogue — all products now
 * come from OneEntry, so item ids are already the OE id as a string.
 */

/** Resolve the OneEntry product id for a UI item. Returns `null` when the id
 *  isn't a plain numeric string — callers treat that as "local-only, do not
 *  call the API" and emit a UI warning. */
export function getCmsProductId(playgroundId: string): number | null {
  return /^\d+$/.test(playgroundId) ? Number(playgroundId) : null;
}

/** Resolve the UI-facing string id for a OneEntry product id. Never returns
 *  `null` in the new architecture — kept for call-site backwards-compat so
 *  existing `?? String(...)` fallbacks stay meaningful (e.g. if a caller
 *  passes NaN we still hand back a stable string). */
export function getPlaygroundProductId(cmsId: number): string | null {
  return Number.isFinite(cmsId) ? String(cmsId) : null;
}
