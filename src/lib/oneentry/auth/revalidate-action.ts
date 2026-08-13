'use server';
/** ISR invalidation triggered from the browser after an order lands. */
import { revalidateTag } from 'next/cache';

/** Drop the cached surfaces an order placement can invalidate: product listings (stock / status moved) and discount rules. */
export async function revalidateAfterOrderAction(): Promise<void> {
  try {
    revalidateTag('oe-products', 'max');
    revalidateTag('oe-discounts', 'max');
  } catch {
    /* no-op outside a request context (e.g. during tests) */
  }
}
