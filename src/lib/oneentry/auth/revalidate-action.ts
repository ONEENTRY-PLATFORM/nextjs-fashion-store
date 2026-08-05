'use server';
/**
 * ISR invalidation triggered from the browser after an order lands.
 *
 * `revalidateTag` only exists on the server, and the checkout flow now runs
 * client-side (MCP `server-actions`: `Orders` is a user-authorised module, so
 * it is called from the Client Component that owns the session). This tiny
 * Server Action is the bridge — it touches no shopper data, only cache tags.
 */
import { revalidateTag } from 'next/cache';

/**
 * Drop the cached surfaces an order placement can invalidate: product
 * listings (stock / status moved) and discount rules (single-use coupons and
 * usage-capped tiers may have just consumed a slot).
 * @returns {Promise<void>} Resolves once both tags are invalidated.
 */
export async function revalidateAfterOrderAction(): Promise<void> {
  try {
    revalidateTag('oe-products', 'max');
    revalidateTag('oe-discounts', 'max');
  } catch {
    /* no-op outside a request context (e.g. during tests) */
  }
}
