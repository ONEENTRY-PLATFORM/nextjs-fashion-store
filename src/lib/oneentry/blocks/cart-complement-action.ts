/** Products for a `cart_complement_block` (marker `catalog_cross_sell` and friends). Browser call: the response is per-visitor and must never be cached. */
import type { Product } from '@/app/components/product/ProductCard';
import { getProductsByIdsAction } from '@/lib/oneentry/catalog/products-action';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';

import { getApiSafe, hasStoredSession, isError } from '..';

/** Load the cross-sell products OE recommends for the current visitor. */
export async function loadCartComplementProductsAction(
  marker: string,
  guestId?: string,
  lang: string = DEFAULT_LOCALE,
): Promise<Product[]> {
  const api = getApiSafe();
  if (!api || !marker) return [];

  if (!hasStoredSession() && guestId) {
    api.Blocks.setGuestId(guestId);
  }

  const result = await api.Blocks.getCartComplement(marker, lang);
  if (isError(result)) return [];

  const arr = Array.isArray(result) ? result : ((result as unknown as { items?: Array<{ id?: number }> })?.items ?? []);
  const ids = arr.map((it) => Number(it?.id)).filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return [];

  return getProductsByIdsAction(ids);
}
