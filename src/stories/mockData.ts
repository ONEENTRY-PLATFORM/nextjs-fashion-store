/**
 * Shared mock data for Storybook stories.
 * Uses real product shapes matching the app's type definitions.
 */
import type { Product } from '../app/components/ProductCard';
import type { CartItem, GiftCartItem } from '../app/context/CartContext';

// ─── Products ───────────────────────────────────────────────────────────────

export const MOCK_PRODUCT: Product = {
  id: 'wc-1',
  name: 'Satin Slip Midi Dress',
  brand: 'Reformation',
  price: '$89.99',
  label: 'BESTSELLER',
  colors: ['#000000', '#C4A882', '#A0A0A0'],
  colorImages: [
    'https://images.unsplash.com/photo-1758900727942-531cea0c8186?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    'https://images.unsplash.com/photo-1728485299033-a3b6e98cb5b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    'https://images.unsplash.com/photo-1685953851497-9b67b25f0ed7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  ],
  colorStock: [true, true, false],
  image:
    'https://images.unsplash.com/photo-1758900727942-531cea0c8186?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  sizes: ['XS', 'S', 'M', 'L', 'XL'],
  clothingType: 'Dresses',
  season: 'All-Season',
  material: 'Textile',
  style: 'Casual',
};

export const MOCK_SALE_PRODUCT: Product = {
  id: 'wc-3',
  name: 'Wrap Mini Dress',
  brand: '& Other Stories',
  price: '$65.00',
  salePrice: '$45.50',
  label: 'SALE',
  colors: ['#000000', '#8B0000', '#556B2F'],
  colorImages: [
    'https://images.unsplash.com/photo-1765248148786-358026d6994d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    'https://images.unsplash.com/photo-1590972381381-c863cbbf9dd2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    'https://images.unsplash.com/photo-1762343291569-680a1efe1fbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  ],
  colorStock: [true, true, false],
  image:
    'https://images.unsplash.com/photo-1765248148786-358026d6994d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  sizes: ['XS', 'S', 'M', 'L', 'XL'],
};

export const MOCK_OOS_PRODUCT: Product = {
  id: 'wc-oos',
  name: 'Linen Wide-Leg Trousers',
  brand: 'COS',
  price: '$79.00',
  colors: ['#F5F5DC', '#808080'],
  image:
    'https://images.unsplash.com/photo-1594938298603-c8148c4b4528?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  sizes: ['XS', 'S', 'M', 'L'],
  inStock: false,
};

export const MOCK_MULTICOLOR_PRODUCT: Product = {
  id: 'wc-multi',
  name: 'Oversized Cashmere Sweater',
  brand: 'Toteme',
  price: '$320.00',
  colors: ['#FFFFFF', '#000000', '#C4A882', '#8B0000', '#556B2F', '#4169E1'],
  image:
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  sizes: ['XS', 'S', 'M', 'L', 'XL'],
};

/** Product not yet released — renders "Coming soon" badge in QuickViewModal. */
export const MOCK_COMING_SOON_PRODUCT: Product = {
  id: 'wc-cs',
  name: 'Structured Wool Blazer',
  brand: 'Toteme',
  price: '$420.00',
  label: 'COMING SOON',
  colors: ['#1A1A1A', '#C4A882'],
  colorImages: [
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    'https://images.unsplash.com/photo-1617038220319-276d3cfab638?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  ],
  colorStock: [true, true],
  image:
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  sizes: ['XS', 'S', 'M', 'L'],
  statusIdentifier: 'coming_soon',
};

/** Product available for pre-order — renders "Pre-order" badge in QuickViewModal. */
export const MOCK_PREORDER_PRODUCT: Product = {
  id: 'wc-pre',
  name: 'Cashmere Turtleneck',
  brand: 'Johnstons of Elgin',
  price: '$280.00',
  label: 'PRE-ORDER',
  colors: ['#F5F0EB', '#2C2C2C', '#8B3A3A'],
  colorImages: [
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  ],
  colorStock: [true, true, true],
  image:
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  sizes: ['XS', 'S', 'M', 'L', 'XL'],
  statusIdentifier: 'preorder',
};

/** Product that ships a single size — used to verify auto-selection behaviour. */
export const MOCK_SINGLE_SIZE_PRODUCT: Product = {
  id: 'wc-onesize',
  name: 'Silk Square Scarf',
  brand: 'Toteme',
  price: '$120.00',
  label: 'NEW IN',
  colors: ['#000000', '#C4A882'],
  colorImages: [
    'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  ],
  colorStock: [true, true],
  image:
    'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  sizes: ['ONE SIZE'],
  clothingType: 'Accessories',
};

// ─── Wishlist items ──────────────────────────────────────────────────────────

import type { WishlistItem } from '../app/context/WishlistContext';

export const MOCK_WISHLIST_ITEM: WishlistItem = {
  id: 'wc-1',
  name: 'Satin Slip Midi Dress',
  brand: 'Reformation',
  price: '$89.99',
  image:
    'https://images.unsplash.com/photo-1758900727942-531cea0c8186?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  colors: ['#000000', '#C4A882', '#A0A0A0'],
  colorStock: [true, true, false],
  sizes: ['XS', 'S', 'M', 'L', 'XL'],
  inStock: true,
};

export const MOCK_WISHLIST_ITEM_SALE: WishlistItem = {
  id: 'wc-3',
  name: 'Wrap Mini Dress',
  brand: '& Other Stories',
  price: '$65.00',
  salePrice: '$45.50',
  image:
    'https://images.unsplash.com/photo-1765248148786-358026d6994d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  colors: ['#000000', '#8B0000', '#556B2F'],
  colorStock: [true, true, false],
  sizes: ['XS', 'S', 'M', 'L', 'XL'],
  inStock: true,
};

// ─── Cart items ──────────────────────────────────────────────────────────────

export const MOCK_CART_ITEM: CartItem = {
  id: 'wc-1-BLK-S',
  name: 'Satin Slip Midi Dress',
  brand: 'Reformation',
  color: 'Black',
  sku: 'wc-1-BLK-S',
  size: 'S',
  quantity: 1,
  price: 89.99,
  image:
    'https://images.unsplash.com/photo-1758900727942-531cea0c8186?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
};

export const MOCK_CART_ITEM_SALE: CartItem = {
  id: 'wc-3-BLK-M',
  name: 'Wrap Mini Dress',
  brand: '& Other Stories',
  color: 'Black',
  sku: 'wc-3-BLK-M',
  size: 'M',
  quantity: 2,
  price: 45.5,
  originalPrice: 65.0,
  image:
    'https://images.unsplash.com/photo-1765248148786-358026d6994d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
};

/** Free gift appended by OE when a gift-bearing coupon is applied.
 *  `price` is the catalogue price rendered struck-through next to "FREE".
 *  Not stored in Redux — derived from `preview.giftItems` inside `useCart()`.
 *  Cannot be seeded via Redux dispatch; use this fixture in Vitest unit tests
 *  that mock `useCart` directly (see `CartUnavailableNotice.test.tsx` for the
 *  mock pattern). */
export const MOCK_GIFT_CART_ITEM: GiftCartItem = {
  productId: 42,
  name: 'Silk Hair Scrunchie',
  image:
    'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  price: 18.0,
  quantity: 1,
};
