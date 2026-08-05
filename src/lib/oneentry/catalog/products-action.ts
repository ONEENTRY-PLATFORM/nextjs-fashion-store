'use server';
/**
 * Catalogue reads by id, exposed to Client Components.
 *
 * The catalogue itself is public and cached (`unstable_cache` inside
 * `loadProductsByIds`), which only works on the server — so shopper-scoped
 * browser code that needs product details (order thumbnails, wishlist stock,
 * cross-sell) hops through these actions instead of re-fetching per visitor.
 */
import { loadProductsByIds } from './products';
import { adaptCatalogProductToUiProduct } from './adapt';
import type { CatalogProduct } from './products';
import type { Product } from '../../../app/components/ProductCard';

/**
 * Bulk fetch of products by OE numeric id, returned in UI-ready shape.
 * @param {number[]} ids - OE numeric product ids.
 * @returns {Promise<Product[]>} Adapted products, `[]` for an empty input.
 */
export async function getProductsByIdsAction(ids: number[]): Promise<Product[]> {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const items = await loadProductsByIds(ids);
  return items.map(adaptCatalogProductToUiProduct);
}

/**
 * Same fetch, but keeping the full normalized OE shape — callers that need
 * stock / status / attribute details the UI `Product` type drops.
 * @param {number[]} ids - OE numeric product ids.
 * @returns {Promise<CatalogProduct[]>} Normalized products, `[]` when empty.
 */
export async function getCatalogProductsByIdsAction(ids: number[]): Promise<CatalogProduct[]> {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return loadProductsByIds(ids);
}
