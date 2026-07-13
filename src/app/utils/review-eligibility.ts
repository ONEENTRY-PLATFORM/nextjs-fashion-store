import type { OeOrder } from '../../lib/oneentry/auth/actions';

/**
 * "Terminal successful" order statuses — the shopper actually took delivery
 * of the item. Mirrors the pattern used elsewhere in the app
 * (`bucketOeStatus`, `computeLtv`) — OE tenants namespace status markers per
 * storage (`home_done`, `pickup_delivered`, …), so we match by substring.
 */
const DELIVERED_STATUS = /deliver|complete|done|closed|finish|received|arrived/i;

/**
 * Returns `true` when the shopper has at least one delivered / done order
 * that contains the given product. Reviews are gated on this so we don't
 * accept feedback from users who never actually received the item.
 * Guests (no `orders` list) always return `false`.
 */
export function canReviewProduct(
  orders: OeOrder[] | undefined | null,
  productId: number,
): boolean {
  if (!orders || orders.length === 0) return false;
  if (!Number.isFinite(productId) || productId <= 0) return false;
  return orders.some((o) =>
    DELIVERED_STATUS.test(o.statusIdentifier ?? '')
    && (o.products ?? []).some((p) => p.id === productId),
  );
}
