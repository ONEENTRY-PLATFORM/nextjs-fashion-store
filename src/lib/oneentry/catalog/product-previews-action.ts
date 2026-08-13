'use server';
/** Preview-thumbnail lookup for products referenced from shopper-scoped data. */
import { loadProductsByIds } from './products';

export interface ProductPreview {
  id: number;
  /** Absolute CDN URL of the first product image, `''` when none. */
  preview: string;
}

/** Resolve catalogue preview images for the given product ids. */
export async function getProductPreviewsAction(ids: number[]): Promise<ProductPreview[]> {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const items = await loadProductsByIds(ids);
  return items.filter((p) => Boolean(p.preview)).map((p) => ({ id: p.id, preview: p.preview }));
}
