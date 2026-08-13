import type { OeOrder } from '@/lib/oneentry/auth/actions';

/** "Terminal successful" order statuses — the shopper actually took delivery of the item. */
const DELIVERED_STATUS = /deliver|complete|done|closed|finish|received|arrived/i;

/** Returns `true` when the shopper has at least one delivered / done order that contains the given product. */
export function canReviewProduct(orders: OeOrder[] | undefined | null, productId: number): boolean {
  if (!orders || orders.length === 0) return false;
  if (!Number.isFinite(productId) || productId <= 0) return false;
  return orders.some(
    (o) => DELIVERED_STATUS.test(o.statusIdentifier ?? '') && (o.products ?? []).some((p) => p.id === productId),
  );
}
