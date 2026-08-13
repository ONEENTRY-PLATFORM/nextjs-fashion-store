'use server';
import type { Product } from '@/app/components/product/ProductCard';

import { adaptCatalogProductToUiProduct } from './adapt';
import { searchProducts } from './products';

/** Server-action wrapper for the combined vector + quick search loader. */
export async function searchProductsAction(query: string): Promise<Product[]> {
  const products = await searchProducts(query, { limit: 12 });
  return products.map(adaptCatalogProductToUiProduct);
}
