'use server';
import { loadProductsByIds } from './products';
import { getWishlistAction } from '../auth/actions';
import type { CatalogProduct } from './products';
import type { WaitingItem, WaitingStockStatus } from '../../../app/data/userData';

const stockToStatus = (p: CatalogProduct): WaitingStockStatus => {
  if (p.statusIdentifier === 'out_of_stock' || p.stock <= 0) return 'out_of_stock';
  if (p.stock <= 3) return 'low_stock';
  return 'back_in_stock';
};

/**
 * Derive the user's waiting list from /me/wishlist. Each wishlist item is
 * enriched with current stock status from the OE catalog. The traditional
 * "waiting list" semantics (out-of-stock items the user wants to be
 * notified about) are inferred — out_of_stock + low_stock items qualify.
 */
export async function getWaitingListAction(): Promise<WaitingItem[]> {
  const wishlist = await getWishlistAction();
  if (wishlist.length === 0) return [];
  const products = await loadProductsByIds(wishlist.map((w) => w.productId));
  const byId = new Map(products.map((p) => [p.id, p]));
  return wishlist.flatMap<WaitingItem>((srv) => {
    const p = byId.get(srv.productId);
    if (!p) return [];
    const status = stockToStatus(p);
    return [{
      id: String(p.id),
      name: p.title,
      brand: p.brand,
      price: p.price,
      img: p.preview,
      size: p.sizes[0] ?? '',
      color: p.colors[0] ?? '',
      status,
      notify: true,
      addedDate: srv.addedAt
        ? new Date(srv.addedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '',
    }];
  });
}
