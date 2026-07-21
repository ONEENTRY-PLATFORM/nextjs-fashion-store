'use server';

/**
 * Fetch products for a `cart_complement_block` (marker `catalog_cross_sell`
 * and friends) with the caller's real OE context — either an authorized
 * user's access token or the anonymous visitor's guest id. OE resolves
 * the cross-sell against the caller's cart / activity history; without a
 * context the endpoint returns `{ items: [], total: 0 }`.
 *
 * NOT cached: the response is per-user, and caching would leak one
 * visitor's cross-sell into another visitor's session. Called on-demand
 * from `<CartComplementBlockSlot>` inside `PageBlocksRenderer`.
 */
import { getUserApi, getGuestApi, isError, isOneEntryEnabled } from '..';
import { readAccessOrRefresh } from '../auth/session';
import { loadProducts } from '../catalog/products';
import { adaptCatalogProductToUiProduct } from '../catalog/adapt';
import type { Product } from '../../../app/components/ProductCard';
import { DEFAULT_LOCALE } from '../locale';

export async function loadCartComplementProductsAction(
  marker: string,
  guestId?: string,
  lang: string = DEFAULT_LOCALE,
): Promise<Product[]> {
  if (!isOneEntryEnabled || !marker) return [];

  // Prefer the authenticated user's SDK — OE uses the bearer token to
  // resolve the current cart / order history. Falls back to a guest
  // instance carrying `x-guest-id` for anonymous shoppers so the trail
  // built up before login is still considered.
  const access = await readAccessOrRefresh();
  const api = access
    ? getUserApi(access)
    : (guestId ? getGuestApi(guestId) : null);
  if (!api) return [];

  const result = await api.Blocks.getCartComplement(marker, lang);
  if (isError(result)) return [];

  const arr = Array.isArray(result)
    ? result
    : (result as unknown as { items?: Array<{ id?: number }> })?.items ?? [];
  const ids = arr
    .map((it) => Number(it?.id))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return [];

  const { items } = await loadProducts({ ids, limit: ids.length });
  return items.map(adaptCatalogProductToUiProduct);
}
