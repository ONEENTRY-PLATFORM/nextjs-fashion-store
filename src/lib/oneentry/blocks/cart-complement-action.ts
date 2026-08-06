/**
 * Products for a `cart_complement_block` (marker `catalog_cross_sell` and
 * friends). OE resolves the cross-sell against the caller's own cart /
 * activity history, so the request must carry the visitor's context — a
 * bearer token for signed-in shoppers, `x-guest-id` for anonymous ones.
 *
 * That makes it a browser call (MCP `server-actions`): the SDK singleton here
 * already holds the session, and the response is per-visitor so it must never
 * be cached. Only the follow-up catalogue read is cached — that part is public
 * and stays on the server behind `getProductsByIdsAction`.
 */
import { getApiSafe, hasStoredSession, isError } from '..';
import { getProductsByIdsAction } from '../catalog/products-action';
import type { Product } from '../../../app/components/product/ProductCard';
import { DEFAULT_LOCALE } from '../locale';

/**
 * Load the cross-sell products OE recommends for the current visitor.
 * @param {string} marker    - Block marker configured in OE.
 * @param {string} [guestId] - Anonymous visitor id, for guests.
 * @param {string} [lang]    - OE locale code.
 * @returns {Promise<Product[]>} UI-ready products, `[]` when nothing applies.
 */
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

  const arr = Array.isArray(result)
    ? result
    : (result as unknown as { items?: Array<{ id?: number }> })?.items ?? [];
  const ids = arr
    .map((it) => Number(it?.id))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return [];

  return getProductsByIdsAction(ids);
}
