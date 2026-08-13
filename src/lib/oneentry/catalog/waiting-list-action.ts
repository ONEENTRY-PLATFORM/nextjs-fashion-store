/** Waiting list = the shopper's OE wishlist, annotated with live stock status. */
import type { WaitingItem, WaitingStockStatus } from '@/app/data/userData';
import { getWishlistAction } from '@/lib/oneentry/auth/actions';

import type { CatalogProduct } from './products';
import { getCatalogProductsByIdsAction } from './products-action';

const stockToStatus = (p: CatalogProduct): WaitingStockStatus => {
  if (p.statusIdentifier === 'out_of_stock' || p.stock <= 0) return 'out_of_stock';
  if (p.stock <= 3) return 'low_stock';
  return 'back_in_stock';
};

/** Derive the user's waiting list from /me/wishlist. */
export async function getWaitingListAction(): Promise<WaitingItem[]> {
  const wishlist = await getWishlistAction();
  if (wishlist.length === 0) return [];
  const products = await getCatalogProductsByIdsAction(wishlist.map((w) => w.productId));
  const byId = new Map(products.map((p) => [p.id, p]));
  return wishlist.flatMap<WaitingItem>((srv) => {
    const p = byId.get(srv.productId);
    if (!p) return [];
    const status = stockToStatus(p);
    return [
      {
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
      },
    ];
  });
}
