'use server';
/** ISR invalidation triggered from the browser after an order lands. */
import { revalidateTag } from 'next/cache';

import { productTag } from '@/lib/oneentry/catalog/product-tags';

/**
 * Drop the cached surfaces one order can invalidate — the products it moved stock on.
 *
 * It used to drop the blanket `oe-products` tag, which invalidates every PDP in the catalog: one
 * checkout then made the next crawler pass rewrite thousands of ISR entries. Discount rules are no
 * longer flushed here either — placing an order does not edit them, and they carry their own TTL.
 */
export async function revalidateAfterOrderAction(productIds: number[] = []): Promise<void> {
  try {
    for (const id of productIds) {
      if (Number.isFinite(id) && id > 0) revalidateTag(productTag(id), 'max');
    }
  } catch {
    /* no-op outside a request context (e.g. during tests) */
  }
}
