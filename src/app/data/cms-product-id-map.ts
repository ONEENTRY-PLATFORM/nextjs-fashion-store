/** Product id helpers between the UI-facing string form (`item.id`) and the OneEntry numeric `products.id` used by the server. */

/** Resolve the OneEntry product id for a UI item. */
export function getCmsProductId(playgroundId: string): number | null {
  return /^\d+$/.test(playgroundId) ? Number(playgroundId) : null;
}

/** Tolerant variant of `getCmsProductId`. */
export function extractCmsProductId(anyId: string): number | null {
  const m = /^(\d+)(?:$|[^\d])/.exec(anyId);
  return m ? Number(m[1]) : null;
}

/** Resolve the UI-facing string id for a OneEntry product id. */
export function getPlaygroundProductId(cmsId: number): string | null {
  return Number.isFinite(cmsId) ? String(cmsId) : null;
}
