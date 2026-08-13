'use server';
/** Catalogue reads by id, exposed to Client Components. */
import type { Product } from '@/app/components/product/ProductCard';

import { adaptCatalogProductToUiProduct } from './adapt';
import type { CatalogProduct } from './products';
import { loadProductsByIds } from './products';

/** Bulk fetch of products by OE numeric id, returned in UI-ready shape. */
export async function getProductsByIdsAction(ids: number[]): Promise<Product[]> {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const items = await loadProductsByIds(ids);
  return items.map(adaptCatalogProductToUiProduct);
}

/** Same fetch, but keeping the full normalized OE shape. */
export async function getCatalogProductsByIdsAction(ids: number[]): Promise<CatalogProduct[]> {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return loadProductsByIds(ids);
}
