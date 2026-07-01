'use server';
import { loadProductsByIds } from './products';
import { adaptCatalogProductToUiProduct } from './adapt';
import type { Product } from '../../../app/components/ProductCard';

/** Bulk fetch of products by OE numeric id, returned in UI-ready shape. */
export async function getProductsByIdsAction(ids: number[]): Promise<Product[]> {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const items = await loadProductsByIds(ids);
  return items.map(adaptCatalogProductToUiProduct);
}
