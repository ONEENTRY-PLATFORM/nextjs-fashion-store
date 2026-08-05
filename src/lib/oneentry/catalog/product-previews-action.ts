'use server';
/**
 * Preview-thumbnail lookup for products referenced from shopper-scoped data.
 *
 * Order snapshots frequently ship `previewImage: null` (OE does not inline the
 * picture entity), so the account pages fall back to the catalogue image. The
 * catalogue read itself is public and cached (`unstable_cache` inside
 * `loadProductsByIds`), which only works on the server — hence this thin
 * Server Action rather than an SDK call from the browser.
 */
import { loadProductsByIds } from './products';

export interface ProductPreview {
  id: number;
  /** Absolute CDN URL of the first product image, `''` when none. */
  preview: string;
}

/**
 * Resolve catalogue preview images for the given product ids.
 * @param {number[]} ids - OE numeric product ids.
 * @returns {Promise<ProductPreview[]>} One entry per product that has an image.
 */
export async function getProductPreviewsAction(ids: number[]): Promise<ProductPreview[]> {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const items = await loadProductsByIds(ids);
  return items
    .filter((p) => Boolean(p.preview))
    .map((p) => ({ id: p.id, preview: p.preview }));
}
