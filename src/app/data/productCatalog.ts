export interface SizeOption {
  label: string;
  available: boolean;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductReview {
  id: number;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  size: string;
  helpful: number;
  verified: boolean;
}

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  salePrice?: number;
  image: string;
  colors: string[];
  /** Per-color images (same index as colors). */
  colorImages?: string[];
  /** Per-color stock (same index as colors). undefined = all in stock. */
  colorStock?: boolean[];
  badge?: string;
  inStock?: boolean;
  /** Product-specific gallery images (5 photos). From OE `pictures_22`. */
  galleryImages?: string[];
  /** Product-specific size options. From OE `size_10`. */
  sizeOptions?: SizeOption[];
  /** Product-specific specifications. From OE attribute set. */
  specs?: ProductSpec[];
  /** Product-specific reviews. From OE form-data `review_feedback`/`review_rating`. */
  reviews?: ProductReview[];
  /** ID of the recommended-products block to show on the detail page */
  recommendedId?: string;
  /** ID of the special-offers group to show on the detail page */
  specialOffersId?: string;
  /** Product detail bullet points */
  productDetails?: string[];
  /** Long-form description body (HTML-safe rich text from OE). */
  descriptionHtml?: string;
  /** Care icons / hints — one per line. From OE `careinstructions_18`. */
  careInstructions?: string[];
  /** Filter fields — mirrors Product interface */
  clothingType?: string;
  shoeType?: string;
  bagType?: string;
  accessoryType?: string;
  material?: string;
  /** Linked variants from OE (colour/size siblings). PDP consumes this to
   *  compute per-swatch availability that respects the currently picked
   *  colour (e.g. `2XS` may be in stock for Red but not for Blue). */
  variants?: PdpProductVariant[];
}

export interface PdpProductVariant {
  id: string;
  colors: string[];
  sizes: string[];
  /** Whether this specific variant is buyable (`stock > 0` or the OE status
   *  flag isn't `out_of_stock`). Copied from `CatalogProductVariant`. */
  inStock: boolean;
  /** Per-variant sale price / regular price / SKU / imagery so the PDP can
   *  swap them in when the shopper picks a colour or size. */
  price?: number;
  sku?: string;
  image?: string;
  images?: string[];
  descriptionHtml?: string;
  /** OE availability flag. `coming_soon` renders as "Pre-order" and still
   *  lets the customer add to cart; `out_of_stock` disables purchase. */
  statusIdentifier?: string;
}

// All product-specific PDP data (images, colors, sizes, specs, reviews) is
// loaded from OneEntry at runtime — no static fallbacks remain.

const _CATALOG: Record<string, CatalogProduct> = {
  // ── Women's Shoes ──────────────────────────────────────────────
  'ws-1': { id: 'ws-1', name: 'Satin Ballet Flats', brand: 'Kekimoro', price: 75.00, image: 'https://images.unsplash.com/photo-1739616194227-0c4a98642c83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#F88A8A', '#C4A882'], badge: 'NEW' },
  'ws-2': { id: 'ws-2', name: 'Leather Ankle Boots', brand: 'Kekimoro', price: 189.00, image: 'https://images.unsplash.com/photo-1591355904265-f0b5f5d7afc5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#800020'], badge: 'NEW' },
  'ws-3': { id: 'ws-3', name: 'Classic White Sneakers', brand: 'Kekimoro', price: 109.00, image: 'https://images.unsplash.com/photo-1624211813285-e83873b90934?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#FFFFFF', '#000000', '#808080'] },
  'ws-4': { id: 'ws-4', name: 'Heeled Strappy Sandals', brand: 'Kekimoro', price: 135.00, salePrice: 94.50, image: 'https://images.unsplash.com/photo-1566499003412-4736d6099504?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#D4AF37'], badge: 'SALE' },
  'ws-5': { id: 'ws-5', name: 'Chunky Platform Loafers', brand: 'Kekimoro', price: 159.00, image: 'https://images.unsplash.com/photo-1662280700165-129b82569b88?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#808080'], badge: 'NEW' },
  'ws-6': { id: 'ws-6', name: 'Stiletto Evening Pumps', brand: 'Kekimoro', price: 215.00, image: 'https://images.unsplash.com/photo-1673377441728-23e984e70521?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#800020', '#D4AF37'] },
  'ws-7': { id: 'ws-7', name: 'Suede Open-Toe Mules', brand: 'Kekimoro', price: 119.00, salePrice: 83.30, image: 'https://images.unsplash.com/photo-1718823108228-091cca005709?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#F88A8A'], badge: 'SALE' },
  'ws-8': { id: 'ws-8', name: 'Western Cowboy Boots', brand: 'Kekimoro', price: 245.00, image: 'https://images.unsplash.com/photo-1578847948036-7c6109024c76?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#5C3A1E', '#000000'], badge: 'NEW' },
  'ws-9': { id: 'ws-9', name: 'Sport Running Trainers', brand: 'Kekimoro', price: 139.00, image: 'https://images.unsplash.com/photo-1635863945120-b2edcc6d9756?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#F88A8A', '#FFFFFF', '#000000'] },
  'ws-10': { id: 'ws-10', name: 'Shearling UGG Boots', brand: 'Kekimoro', price: 179.00, image: 'https://images.unsplash.com/photo-1552594375-1be3d3cd1071?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#808080'] },
  'ws-11': { id: 'ws-11', name: 'Vintage Mary Jane Shoes', brand: 'Kekimoro', price: 95.00, image: 'https://images.unsplash.com/photo-1647089490729-4ba9a9317eb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#800020', '#F88A8A'], badge: 'NEW' },
  'ws-12': { id: 'ws-12', name: 'Knee-High Leather Boots', brand: 'Kekimoro', price: 289.00, image: 'https://images.unsplash.com/photo-1707676179930-b2a8d251288a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#800020'] },

  // ── Women's Catalog ────────────────────────────────────────────
  'wc-1': { id: 'wc-1', name: 'Satin Slip Midi Dress', brand: 'Kekimoro', price: 89.99, image: 'https://images.unsplash.com/photo-1758900727942-531cea0c8186?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#C4A882', '#A0A0A0'] },
  'wc-2': { id: 'wc-2', name: 'Ribbed Seamless Crop Top', brand: 'Kekimoro', price: 34.99, image: 'https://images.unsplash.com/photo-1730714311842-02cbac4e957f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#FFFFFF', '#F88A8A'] },
  'wc-3': { id: 'wc-3', name: 'Wrap Mini Dress', brand: 'Kekimoro', price: 65.00, salePrice: 45.50, image: 'https://images.unsplash.com/photo-1765248148786-358026d6994d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#8B0000', '#556B2F'], badge: 'SALE' },
  'wc-4': { id: 'wc-4', name: 'Oversized Double-Breasted Blazer', brand: 'Kekimoro', price: 129.99, image: 'https://images.unsplash.com/photo-1752794674474-c0bf53a1ece0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#808080', '#C4A882'] },
  'wc-5': { id: 'wc-5', name: 'High Rise Flare Jeans', brand: 'Kekimoro', price: 79.99, image: 'https://images.unsplash.com/photo-1762343291569-680a1efe1fbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#1B3A5C', '#000000', '#5C3A1E'] },
  'wc-6': { id: 'wc-6', name: 'Chunky Cable Knit Pullover', brand: 'Kekimoro', price: 59.99, image: 'https://images.unsplash.com/photo-1687275159654-13e292177bfc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#FFFFFF', '#808080'] },
  'wc-7': { id: 'wc-7', name: 'Pleated Midi Skirt', brand: 'Kekimoro', price: 49.99, image: 'https://images.unsplash.com/photo-1685953851497-9b67b25f0ed7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#FFE4E1', '#A0522D'] },
  'wc-8': { id: 'wc-8', name: 'Bias Cut Satin Dress', brand: 'Kekimoro', price: 75.00, salePrice: 52.50, image: 'https://images.unsplash.com/photo-1728485299033-a3b6e98cb5b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C0C0C0', '#000000', '#C4A882'], badge: 'SALE' },
  'wc-9': { id: 'wc-9', name: 'Seamless Bodysuit', brand: 'Kekimoro', price: 38.99, image: 'https://images.unsplash.com/photo-1759646881002-33ce4a8bf3d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#FFFFFF', '#F88A8A'], badge: 'NEW' },
  'wc-10': { id: 'wc-10', name: 'Faux Leather Moto Jacket', brand: 'Kekimoro', price: 149.99, image: 'https://images.unsplash.com/photo-1734794070061-51143f03c3c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#4A0000', '#808080'], badge: 'NEW' },
  'wc-11': { id: 'wc-11', name: 'Wide Leg Linen Trousers', brand: 'Kekimoro', price: 69.99, image: 'https://images.unsplash.com/photo-1758543144593-95061a3f418a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#F5F0E8', '#000000', '#808080'] },
  'wc-12': { id: 'wc-12', name: 'Floral Print Wrap Dress', brand: 'Kekimoro', price: 55.00, image: 'https://images.unsplash.com/photo-1762777777722-3242a1f1c575?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#FF6B6B', '#4169E1', '#2E8B57'] },
  'wc-13': { id: 'wc-13', name: 'Oversized Comfort Hoodie', brand: 'Kekimoro', price: 44.99, image: 'https://images.unsplash.com/photo-1760551734585-317f12b57c52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#808080', '#000000', '#F88A8A'] },
  'wc-14': { id: 'wc-14', name: 'Straight Leg Tailored Trousers', brand: 'Kekimoro', price: 64.99, image: 'https://images.unsplash.com/photo-1555928801-596c2dde2ff2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#FFFFFF', '#808080'] },
  'wc-15': { id: 'wc-15', name: 'Flowy Boho Maxi Dress', brand: 'Kekimoro', price: 89.99, salePrice: 62.99, image: 'https://images.unsplash.com/photo-1663044023009-cfdb6dd6b89c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#8B0000', '#C4A882', '#2E8B57'], badge: 'SALE' },
  'wc-16': { id: 'wc-16', name: 'Classic Trench Coat', brand: 'Kekimoro', price: 199.99, image: 'https://images.unsplash.com/photo-1763457990282-12c03d39bfb7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#808080'], badge: 'NEW' },

  // ── Women's Bags ───────────────────────────────────────────────
  'wb-1': { id: 'wb-1', name: 'Velvet Evening Clutch', brand: 'Kekimoro', price: 89.00, image: 'https://images.unsplash.com/photo-1741192387827-03d239d5263b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#800020', '#D4AF37'], badge: 'NEW' },
  'wb-2': { id: 'wb-2', name: 'Large Leather Tote', brand: 'Kekimoro', price: 179.00, image: 'https://images.unsplash.com/photo-1711113456820-639918258722?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#5C3A1E'], badge: 'NEW' },
  'wb-3': { id: 'wb-3', name: 'Slim Crossbody Bag', brand: 'Kekimoro', price: 119.00, image: 'https://images.unsplash.com/photo-1624914990379-f2082e413b4c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#1B3A5C'] },
  'wb-4': { id: 'wb-4', name: 'Structured Top-Handle Bag', brand: 'Kekimoro', price: 215.00, image: 'https://images.unsplash.com/photo-1652371387121-c5850db056ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#C4A882', '#800020'], badge: 'NEW' },
  'wb-5': { id: 'wb-5', name: 'Fashion Belt Bag', brand: 'Kekimoro', price: 79.00, image: 'https://images.unsplash.com/photo-1599926182149-175622a1bd8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#C4A882'], badge: 'NEW' },
  'wb-6': { id: 'wb-6', name: 'Hardshell Cabin Suitcase', brand: 'Kekimoro', price: 299.00, salePrice: 209.30, image: 'https://images.unsplash.com/photo-1654686473683-79cef3d57db6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#F88A8A', '#000000', '#808080'], badge: 'SALE' },
  'wb-7': { id: 'wb-7', name: 'Mini Chain Shoulder Bag', brand: 'Kekimoro', price: 95.00, image: 'https://images.unsplash.com/photo-1660370678274-42bdb518c294?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#D4AF37', '#F88A8A'] },
  'wb-8': { id: 'wb-8', name: 'Suede Bucket Bag', brand: 'Kekimoro', price: 149.00, salePrice: 104.30, image: 'https://images.unsplash.com/photo-1654111081532-68b96326f24f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#808080', '#000000'], badge: 'SALE' },
  'wb-9': { id: 'wb-9', name: 'Woven Raffia Summer Bag', brand: 'Kekimoro', price: 69.00, image: 'https://images.unsplash.com/photo-1722081346616-7f47909b8309?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#5C3A1E', '#FFFFFF'], badge: 'NEW' },
  'wb-10': { id: 'wb-10', name: 'Work Laptop Tote', brand: 'Kekimoro', price: 159.00, image: 'https://images.unsplash.com/photo-1665832102671-74fc84821a3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#808080'], badge: 'NEW' },
  'wb-11': { id: 'wb-11', name: 'Cosmetic Pouch Set', brand: 'Kekimoro', price: 45.00, image: 'https://images.unsplash.com/photo-1618183876181-3df5b83e7be9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#F88A8A', '#000000', '#FFFFFF'] },
  'wb-12': { id: 'wb-12', name: 'Boho Fringe Shoulder Bag', brand: 'Kekimoro', price: 99.00, image: 'https://images.unsplash.com/photo-1758798460539-781b0bb466e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#5C3A1E', '#808080'] },

  // ── Women's Accessories ────────────────────────────────────────
  'wa-1': { id: 'wa-1', name: 'Gold Statement Necklace', brand: 'Kekimoro', price: 79.00, image: 'https://images.unsplash.com/photo-1770283554352-42c28278b885?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#D4AF37', '#C0C0C0', '#000000'], badge: 'NEW' },
  'wa-2': { id: 'wa-2', name: 'Silk Printed Scarf', brand: 'Kekimoro', price: 109.00, image: 'https://images.unsplash.com/photo-1620740199226-2420c2fcaa18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#D4AF37', '#800020', '#4169E1'], badge: 'NEW' },
  'wa-3': { id: 'wa-3', name: 'Nappa Leather Gloves', brand: 'Kekimoro', price: 89.00, image: 'https://images.unsplash.com/photo-1672258070318-0205bd2915de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#800020'] },
  'wa-4': { id: 'wa-4', name: 'Wide Leather Belt', brand: 'Kekimoro', price: 69.00, salePrice: 48.30, image: 'https://images.unsplash.com/photo-1599926182149-175622a1bd8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#C4A882'], badge: 'SALE' },
  'wa-5': { id: 'wa-5', name: 'Oversized Square Sunglasses', brand: 'Kekimoro', price: 59.00, image: 'https://images.unsplash.com/photo-1590330297626-d7aff25a0431?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#800020'], badge: 'NEW' },
  'wa-6': { id: 'wa-6', name: 'Cashmere Knit Beanie', brand: 'Kekimoro', price: 55.00, image: 'https://images.unsplash.com/photo-1687275165995-e474a2e89faa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#808080', '#800020'] },
  'wa-7': { id: 'wa-7', name: 'Fashion Crew Socks 3-Pack', brand: 'Kekimoro', price: 29.00, image: 'https://images.unsplash.com/photo-1679391903287-b52bee558313?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#F88A8A', '#000000', '#4169E1'], badge: 'NEW' },
  'wa-8': { id: 'wa-8', name: 'Auto Compact Umbrella', brand: 'Kekimoro', price: 45.00, salePrice: 31.50, image: 'https://images.unsplash.com/photo-1744618427625-b96a9596a489?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#F88A8A', '#1B3A5C'], badge: 'SALE' },
  'wa-9': { id: 'wa-9', name: 'Slim Leather Cardholder', brand: 'Kekimoro', price: 49.00, image: 'https://images.unsplash.com/photo-1651928692943-5d837fccf061?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#C4A882'] },
  'wa-10': { id: 'wa-10', name: 'Drop Earrings Set', brand: 'Kekimoro', price: 39.00, image: 'https://images.unsplash.com/photo-1625516152414-8f33eef3d660?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#D4AF37', '#C0C0C0', '#000000'], badge: 'NEW' },
  'wa-11': { id: 'wa-11', name: 'Bracelet Stack Collection', brand: 'Kekimoro', price: 65.00, image: 'https://images.unsplash.com/photo-1665703156495-d0be1572257c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#D4AF37', '#C0C0C0', '#F88A8A'] },
  'wa-12': { id: 'wa-12', name: 'Charm Keychain Set', brand: 'Kekimoro', price: 25.00, image: 'https://images.unsplash.com/photo-1588568003116-74b86c8b554d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#D4AF37', '#C0C0C0', '#F88A8A'] },

  // ── Men's Catalog ──────────────────────────────────────────────
  'mc-1': { id: 'mc-1', name: 'Double-Breasted Wool Suit', brand: 'Kekimoro', price: 289.99, image: 'https://images.unsplash.com/photo-1769467304160-53ef42ec2afb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#1B3A5C', '#36454F', '#000000'], badge: 'NEW' },
  'mc-2': { id: 'mc-2', name: 'Relaxed Linen Shirt', brand: 'Kekimoro', price: 59.99, image: 'https://images.unsplash.com/photo-1763610452420-71b91bc59160?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#FFFFFF', '#C4A882', '#1B3A5C'] },
  'mc-3': { id: 'mc-3', name: 'Slim-Fit Selvedge Jeans', brand: 'Kekimoro', price: 119.99, salePrice: 79.99, image: 'https://images.unsplash.com/photo-1765449582468-1f9d941bc80d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#1B3A5C', '#000000', '#36454F'], badge: 'SALE' },
  'mc-4': { id: 'mc-4', name: 'Wool Overcoat', brand: 'Kekimoro', price: 349.99, image: 'https://images.unsplash.com/photo-1660776864454-628551d83a2c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#36454F', '#C4A882', '#000000'], badge: 'NEW' },
  'mc-5': { id: 'mc-5', name: 'Merino Wool Cable Knit', brand: 'Kekimoro', price: 89.99, image: 'https://images.unsplash.com/photo-1750390200293-92d5a788d3a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#808080', '#FFFFFF'] },
  'mc-6': { id: 'mc-6', name: 'Heavyweight Pullover Hoodie', brand: 'Kekimoro', price: 69.99, image: 'https://images.unsplash.com/photo-1677529979705-a1a3cd27bc20?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#808080', '#000000', '#36454F'] },
  'mc-7': { id: 'mc-7', name: 'Tailored Slim Trousers', brand: 'Kekimoro', price: 99.99, salePrice: 64.99, image: 'https://images.unsplash.com/photo-1619470148547-0adbfc64b595?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#36454F', '#808080'], badge: 'SALE' },
  'mc-8': { id: 'mc-8', name: 'Performance Training Set', brand: 'Kekimoro', price: 79.99, image: 'https://images.unsplash.com/photo-1715609104589-97585b210c6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#1B3A5C', '#808080'], badge: 'NEW' },
  'mc-9': { id: 'mc-9', name: 'Classic Piqué Polo', brand: 'Kekimoro', price: 44.99, image: 'https://images.unsplash.com/photo-1666358085449-a10a39f33942?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#FFFFFF', '#1B3A5C', '#000000'] },
  'mc-10': { id: 'mc-10', name: 'Unstructured Linen Blazer', brand: 'Kekimoro', price: 159.99, image: 'https://images.unsplash.com/photo-1723201964235-ea5b99b55d17?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#FFFFFF', '#36454F'], badge: 'NEW' },
  'mc-11': { id: 'mc-11', name: 'Crinkle Linen Beach Shirt', brand: 'Kekimoro', price: 49.99, image: 'https://images.unsplash.com/photo-1766113482305-c372c204b5ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#FFFFFF', '#C4A882', '#808080'] },
  'mc-12': { id: 'mc-12', name: 'Cargo Swim Shorts', brand: 'Kekimoro', price: 39.99, salePrice: 27.99, image: 'https://images.unsplash.com/photo-1757640229431-3cf07c6018a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#808000', '#1B3A5C', '#000000'], badge: 'SALE' },
  'mc-13': { id: 'mc-13', name: 'Quilted Down Gilet', brand: 'Kekimoro', price: 129.99, image: 'https://images.unsplash.com/photo-1662833595899-07c57d617f56?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#36454F', '#1B3A5C'] },
  'mc-14': { id: 'mc-14', name: 'Ribbed Turtleneck', brand: 'Kekimoro', price: 64.99, image: 'https://images.unsplash.com/photo-1662474126346-8e7c16755d02?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#36454F', '#808080'], badge: 'NEW' },
  'mc-15': { id: 'mc-15', name: 'Relaxed Chino Trousers', brand: 'Kekimoro', price: 74.99, image: 'https://images.unsplash.com/photo-1771923892404-14ec3ccdb136?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#808080', '#FFFFFF'] },
  'mc-16': { id: 'mc-16', name: 'Essential Crewneck Sweatshirt', brand: 'Kekimoro', price: 54.99, salePrice: 38.49, image: 'https://images.unsplash.com/photo-1722926628555-252c1c0258bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#808080', '#C4A882', '#1B3A5C'], badge: 'SALE' },

  // ── Men's Shoes ────────────────────────────────────────────────
  'ms-1': { id: 'ms-1', name: 'Leather Chelsea Boots', brand: 'Kekimoro', price: 219.00, image: 'https://images.unsplash.com/photo-1726293428290-4fa588709cd7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#1B3A5C'], badge: 'NEW' },
  'ms-2': { id: 'ms-2', name: 'Clean Leather Sneakers', brand: 'Kekimoro', price: 159.00, image: 'https://images.unsplash.com/photo-1627361673902-c80df14aecdd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#FFFFFF', '#000000', '#808080'] },
  'ms-3': { id: 'ms-3', name: 'Derby Oxford Shoes', brand: 'Kekimoro', price: 195.00, salePrice: 136.50, image: 'https://images.unsplash.com/photo-1614732145188-bb8b5e12968c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#C4A882'], badge: 'SALE' },
  'ms-4': { id: 'ms-4', name: 'Suede Penny Loafers', brand: 'Kekimoro', price: 179.00, image: 'https://images.unsplash.com/photo-1637998458160-b654169b5e34?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#5C3A1E', '#000000'], badge: 'NEW' },
  'ms-5': { id: 'ms-5', name: 'Chunky Sport Trainers', brand: 'Kekimoro', price: 149.00, image: 'https://images.unsplash.com/photo-1685122089842-74e5143c7b01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#1B3A5C', '#DA1E1E'] },
  'ms-6': { id: 'ms-6', name: 'Heavy Winter Boots', brand: 'Kekimoro', price: 249.00, image: 'https://images.unsplash.com/photo-1548795915-66b6ecd0d826?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#1B3A5C'] },
  'ms-7': { id: 'ms-7', name: 'Driving Moccasins', brand: 'Kekimoro', price: 129.00, salePrice: 90.30, image: 'https://images.unsplash.com/photo-1651777940532-e6e7b9e2ff6c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#5C3A1E', '#C4A882', '#000000'], badge: 'SALE' },
  'ms-8': { id: 'ms-8', name: 'Leather Trekking Sandals', brand: 'Kekimoro', price: 99.00, image: 'https://images.unsplash.com/photo-1663693586817-f7e0ceb27bd7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#5C3A1E'], badge: 'NEW' },
  'ms-9': { id: 'ms-9', name: 'Street Style Ankle Boots', brand: 'Kekimoro', price: 189.00, image: 'https://images.unsplash.com/photo-1766228425968-ed4664b6d640?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#1B3A5C', '#808080'] },
  'ms-10': { id: 'ms-10', name: 'Linen Espadrilles', brand: 'Kekimoro', price: 69.00, image: 'https://images.unsplash.com/photo-1635351316136-86e1eeee6279?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#2E8B57'] },
  'ms-11': { id: 'ms-11', name: 'Shearling UGG Boots', brand: 'Kekimoro', price: 189.00, image: 'https://images.unsplash.com/photo-1611611579520-1756ad57a3c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#808080'] },
  'ms-12': { id: 'ms-12', name: 'Classic Dress Oxfords', brand: 'Kekimoro', price: 229.00, image: 'https://images.unsplash.com/photo-1770198408387-7f45e5d6c056?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#1B3A5C'], badge: 'NEW' },

  // ── Men's Accessories ──────────────────────────────────────────
  'ma-1': { id: 'ma-1', name: 'Braided Leather Belt', brand: 'Kekimoro', price: 79.00, image: 'https://images.unsplash.com/photo-1734383524180-3c6f9b21e8e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#C4A882'], badge: 'NEW' },
  'ma-2': { id: 'ma-2', name: 'Full-Grain Bifold Wallet', brand: 'Kekimoro', price: 95.00, image: 'https://images.unsplash.com/photo-1664735246099-6f4dd53c236a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#1B3A5C'] },
  'ma-3': { id: 'ma-3', name: 'Merino Wool Scarf', brand: 'Kekimoro', price: 89.00, salePrice: 62.30, image: 'https://images.unsplash.com/photo-1703679640716-9ef4c3690a37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#808080', '#1B3A5C'], badge: 'SALE' },
  'ma-4': { id: 'ma-4', name: 'Touchscreen Leather Gloves', brand: 'Kekimoro', price: 75.00, image: 'https://images.unsplash.com/photo-1596894573125-e2c7ecdebe13?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#1B3A5C'], badge: 'NEW' },
  'ma-5': { id: 'ma-5', name: 'Structured Baseball Cap', brand: 'Kekimoro', price: 45.00, image: 'https://images.unsplash.com/photo-1646007086663-aacc73606a92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#1B3A5C', '#808080'] },
  'ma-6': { id: 'ma-6', name: 'Polarized Aviator Sunglasses', brand: 'Kekimoro', price: 69.00, image: 'https://images.unsplash.com/photo-1685641896915-8739681b6dbd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#D4AF37', '#C0C0C0', '#000000'], badge: 'NEW' },
  'ma-7': { id: 'ma-7', name: 'Minimalist Quartz Watch', brand: 'Kekimoro', price: 249.00, salePrice: 174.30, image: 'https://images.unsplash.com/photo-1762232977931-2e3f5949b2aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C0C0C0', '#D4AF37', '#000000'], badge: 'SALE' },
  'ma-8': { id: 'ma-8', name: 'Leather Phone Case', brand: 'Kekimoro', price: 55.00, image: 'https://images.unsplash.com/photo-1703245220581-bfb625025694?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#1B3A5C'], badge: 'NEW' },
  'ma-9': { id: 'ma-9', name: 'Sterling Silver Bracelet', brand: 'Kekimoro', price: 85.00, image: 'https://images.unsplash.com/photo-1679412330075-ef0c1c79f8a8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C0C0C0', '#D4AF37', '#000000'] },
  'ma-10': { id: 'ma-10', name: 'Dress Socks Gift Box', brand: 'Kekimoro', price: 35.00, image: 'https://images.unsplash.com/photo-1553460588-3ba256b9aac9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#1B3A5C', '#800020'] },
  'ma-11': { id: 'ma-11', name: 'Premium Travel Thermos', brand: 'Kekimoro', price: 65.00, image: 'https://images.unsplash.com/photo-1638514866904-63e5d9acad07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C0C0C0', '#000000', '#5C3A1E'], badge: 'NEW' },
  'ma-12': { id: 'ma-12', name: 'Heavy Steel Keychain', brand: 'Kekimoro', price: 29.00, image: 'https://images.unsplash.com/photo-1523812597971-d01100700d9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C0C0C0', '#D4AF37', '#000000'] },

  // ── Men's Bags ─────────────────────────────────────────────────
  'mb-1': { id: 'mb-1', name: 'Classic Leather Briefcase', brand: 'Kekimoro', price: 249.00, image: 'https://images.unsplash.com/photo-1621735320171-a682f45d7172?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#5C3A1E', '#000000', '#808080'], badge: 'NEW' },
  'mb-2': { id: 'mb-2', name: 'Urban Leather Backpack', brand: 'Kekimoro', price: 189.00, image: 'https://images.unsplash.com/photo-1648517400264-e921c8a2c81e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#808080', '#5C3A1E'], badge: 'NEW' },
  'mb-3': { id: 'mb-3', name: 'Pro Laptop Messenger Bag', brand: 'Kekimoro', price: 169.00, image: 'https://images.unsplash.com/photo-1660578008459-3604f6c883c9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#36454F', '#5C3A1E'] },
  'mb-4': { id: 'mb-4', name: 'Urban Belt Bag', brand: 'Kekimoro', price: 89.00, image: 'https://images.unsplash.com/photo-1629916293329-7203d4dd34da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#C4A882', '#808080'], badge: 'NEW' },
  'mb-5': { id: 'mb-5', name: 'Slim Crossbody Bag', brand: 'Kekimoro', price: 129.00, image: 'https://images.unsplash.com/photo-1749215419683-23847ec40e9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#808080'] },
  'mb-6': { id: 'mb-6', name: 'Canvas & Leather Tote', brand: 'Kekimoro', price: 75.00, image: 'https://images.unsplash.com/photo-1549206652-ad0355aadd11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#36454F'] },
  'mb-7': { id: 'mb-7', name: 'Hardshell Cabin Suitcase', brand: 'Kekimoro', price: 349.00, salePrice: 245.00, image: 'https://images.unsplash.com/photo-1581553680321-4fffae59fccd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#808080', '#1B3A5C'], badge: 'SALE' },
  'mb-8': { id: 'mb-8', name: 'Mini Leather Wristlet', brand: 'Kekimoro', price: 65.00, image: 'https://images.unsplash.com/photo-1709898838174-83c3e155654c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#5C3A1E', '#000000', '#C4A882'], badge: 'NEW' },
  'mb-9': { id: 'mb-9', name: 'Document Portfolio Case', brand: 'Kekimoro', price: 195.00, image: 'https://images.unsplash.com/photo-1623295291832-0d455cd3c660?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#5C3A1E', '#000000', '#808080'] },
  'mb-10': { id: 'mb-10', name: 'Top-Handle Weekend Bag', brand: 'Kekimoro', price: 225.00, image: 'https://images.unsplash.com/photo-1637759292654-a12cb2be085e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#C4A882'], badge: 'NEW' },
  'mb-11': { id: 'mb-11', name: 'Suede Shoulder Bag', brand: 'Kekimoro', price: 165.00, salePrice: 99.00, image: 'https://images.unsplash.com/photo-1583791031288-d48c4326d5da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#808080', '#5C3A1E'], badge: 'SALE' },
  'mb-12': { id: 'mb-12', name: 'Animal Print Crossbody', brand: 'Kekimoro', price: 145.00, image: 'https://images.unsplash.com/photo-1563721465742-cc3ead9deb36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#5C3A1E', '#000000', '#808080'] },

  // ── New Arrivals ───────────────────────────────────────────────
  'na-1': { id: 'na-1', name: 'Silk Slip Midi Dress', brand: 'Kekimoro', price: 95.00, image: 'https://images.unsplash.com/photo-1649656341158-8747b003590d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#C0C0C0', '#C4A882'], badge: 'NEW' },
  'na-2': { id: 'na-2', name: 'Oversize Leather Moto Jacket', brand: 'Kekimoro', price: 189.00, image: 'https://images.unsplash.com/photo-1660776864454-628551d83a2c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#4A3728', '#808080'], badge: 'NEW' },
  'na-3': { id: 'na-3', name: 'Draped Satin Evening Dress', brand: 'Kekimoro', price: 120.00, salePrice: 84.00, image: 'https://images.unsplash.com/photo-1538847631723-0bd26d2a28e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C0C0C0', '#FFB6C1', '#000000'], badge: 'SALE' },
  'na-4': { id: 'na-4', name: 'Tailored Wide-Leg Trousers', brand: 'Kekimoro', price: 79.00, image: 'https://images.unsplash.com/photo-1644269444230-c6d1f2722e10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#808080', '#F5F0E8'], badge: 'NEW' },
  'na-5': { id: 'na-5', name: 'Double-Breasted Wool Blazer', brand: 'Kekimoro', price: 145.00, image: 'https://images.unsplash.com/photo-1715408153725-186c6c77fb45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#808080', '#1B3A5C'], badge: 'NEW' },
  'na-6': { id: 'na-6', name: 'Relaxed Linen Shirt', brand: 'Kekimoro', price: 59.00, image: 'https://images.unsplash.com/photo-1697319452360-ee47502e39f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#FFFFFF', '#C4A882', '#4169E1'], badge: 'NEW' },
  'na-7': { id: 'na-7', name: 'Chunky Ribbed Knit Pullover', brand: 'Kekimoro', price: 64.00, image: 'https://images.unsplash.com/photo-1687275159654-13e292177bfc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#FFFFFF', '#808080'], badge: 'NEW' },
  'na-8': { id: 'na-8', name: 'Oversized Zip-Up Hoodie', brand: 'Kekimoro', price: 72.00, image: 'https://images.unsplash.com/photo-1709745490680-eb2d7c94a196?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#808080', '#000000', '#1B3A5C'], badge: 'NEW' },
  'na-9': { id: 'na-9', name: 'Block Heel Pointed Mule', brand: 'Kekimoro', price: 89.00, image: 'https://images.unsplash.com/photo-1704775989614-8435994e4e97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#C4A882', '#FFFFFF'], badge: 'NEW' },
  'na-10': { id: 'na-10', name: 'Leather Derby Sneaker', brand: 'Kekimoro', price: 115.00, image: 'https://images.unsplash.com/photo-1512675828443-4f454c42253a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#FFFFFF', '#000000', '#C4A882'], badge: 'NEW' },
  'na-11': { id: 'na-11', name: 'Suede Ankle Boot', brand: 'Kekimoro', price: 139.00, salePrice: 97.30, image: 'https://images.unsplash.com/photo-1614213908010-49bdfedbca32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#808080'], badge: 'SALE' },
  'na-12': { id: 'na-12', name: 'Brogue Oxford Lace-Up', brand: 'Kekimoro', price: 125.00, image: 'https://images.unsplash.com/photo-1600785670858-21638662e186?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#5C3A1E', '#000000', '#C4A882'], badge: 'NEW' },
  'na-13': { id: 'na-13', name: 'Mini Quilted Shoulder Bag', brand: 'Kekimoro', price: 79.00, image: 'https://images.unsplash.com/photo-1760551601203-12eddfb62216?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#F88A8A', '#C4A882'], badge: 'NEW' },
  'na-14': { id: 'na-14', name: 'Cashmere Wrap Scarf', brand: 'Kekimoro', price: 55.00, image: 'https://images.unsplash.com/photo-1771660724436-a497a119a00c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#FFFFFF', '#808080'], badge: 'NEW' },
  'na-15': { id: 'na-15', name: 'Structured Leather Tote', brand: 'Kekimoro', price: 159.00, image: 'https://images.unsplash.com/photo-1760624294469-550753ec203a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#C4A882'], badge: 'NEW' },
  'na-16': { id: 'na-16', name: 'Stainless Steel Minimalist Watch', brand: 'Kekimoro', price: 195.00, image: 'https://images.unsplash.com/photo-1589270216117-7972b3082c7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C0C0C0', '#000000', '#C4A882'], badge: 'NEW' },

  // ── Sale ───────────────────────────────────────────────────────
  'sale-1': { id: 'sale-1', name: 'Oversized Wool Coat', brand: 'Kekimoro', price: 289.00, salePrice: 144.50, image: 'https://images.unsplash.com/photo-1715408153725-186c6c77fb45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#808080'], badge: '-50%' },
  'sale-2': { id: 'sale-2', name: 'Slim High-Rise Jeans', brand: 'Kekimoro', price: 129.00, salePrice: 77.40, image: 'https://images.unsplash.com/photo-1762164130276-021d7c91cd89?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#1B3A5C', '#000000', '#5C4A3A'], badge: '-40%' },
  'sale-3': { id: 'sale-3', name: 'Leather Heeled Mules', brand: 'Kekimoro', price: 199.00, salePrice: 119.40, image: 'https://images.unsplash.com/photo-1755427476751-ab10970025df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#8B4513'], badge: '-40%' },
  'sale-4': { id: 'sale-4', name: 'Quilted Leather Shoulder Bag', brand: 'Kekimoro', price: 349.00, salePrice: 244.30, image: 'https://images.unsplash.com/photo-1764966844443-1ad233cdc05d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#C4A882', '#DA1E1E'], badge: '-30%' },
  'sale-5': { id: 'sale-5', name: 'Clean White Leather Sneakers', brand: 'Kekimoro', price: 159.00, salePrice: 111.30, image: 'https://images.unsplash.com/photo-1624211813285-e83873b90934?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#FFFFFF', '#000000', '#808080'], badge: '-30%' },
  'sale-6': { id: 'sale-6', name: 'Men Chelsea Leather Boots', brand: 'Kekimoro', price: 249.00, salePrice: 149.40, image: 'https://images.unsplash.com/photo-1708515792135-09a95d8e9119?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E'], badge: '-40%' },
  'sale-7': { id: 'sale-7', name: 'Wrap Midi Dress', brand: 'Kekimoro', price: 169.00, salePrice: 118.30, image: 'https://images.unsplash.com/photo-1602303894456-398ce544d90b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#5C3A1E', '#808080'], badge: '-30%' },
  'sale-8': { id: 'sale-8', name: 'Men Tailored Blazer', brand: 'Kekimoro', price: 319.00, salePrice: 159.50, image: 'https://images.unsplash.com/photo-1629244195252-c2a3967d1a1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#1B3A5C', '#000000', '#808080'], badge: '-50%' },
  'sale-9': { id: 'sale-9', name: 'Monochrome Knit Set', brand: 'Kekimoro', price: 189.00, salePrice: 132.30, image: 'https://images.unsplash.com/photo-1739424464070-63b6cc9086aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#FFFFFF', '#F88A8A'], badge: '-30%' },
  'sale-10': { id: 'sale-10', name: 'Suede Ankle Boots', brand: 'Kekimoro', price: 219.00, salePrice: 109.50, image: 'https://images.unsplash.com/photo-1755427476751-ab10970025df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000', '#5C3A1E'], badge: '-50%' },
  'sale-11': { id: 'sale-11', name: 'Classic Trench Coat', brand: 'Kekimoro', price: 399.00, salePrice: 279.30, image: 'https://images.unsplash.com/photo-1609017604163-e4ca9c619b9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000'], badge: '-30%' },
  'sale-12': { id: 'sale-12', name: 'Structured Mini Bag', brand: 'Kekimoro', price: 229.00, salePrice: 160.30, image: 'https://images.unsplash.com/photo-1764966844443-1ad233cdc05d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#000000', '#DA1E1E', '#C4A882'], badge: '-30%' },

  // ── Out of Stock products ───────────────────────────────────────
  'wc-oos-1':   { id: 'wc-oos-1',   name: 'Velvet Midi Skirt',           brand: 'Kekimoro', price: 79.99,  image: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#800020', '#000000'], inStock: false },
  'wc-oos-2':   { id: 'wc-oos-2',   name: 'Sheer Organza Blouse',        brand: 'Kekimoro', price: 54.99,  image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#FFFFFF', '#F88A8A'], inStock: false },
  'ws-oos-1':   { id: 'ws-oos-1',   name: 'Patent Leather Kitten Heels', brand: 'Kekimoro', price: 145.00, image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#000000', '#800020'], inStock: false },
  'ws-oos-2':   { id: 'ws-oos-2',   name: 'Velvet Block Heel Mules',     brand: 'Kekimoro', price: 129.00, image: 'https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#800020', '#1B3A5C', '#000000'], inStock: false },
  'wb-oos-1':   { id: 'wb-oos-1',   name: 'Croc-Embossed Mini Bag',      brand: 'Kekimoro', price: 175.00, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#000000', '#C4A882'], inStock: false },
  'wb-oos-2':   { id: 'wb-oos-2',   name: 'Beaded Evening Clutch',       brand: 'Kekimoro', price: 139.00, image: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#D4AF37', '#000000'], inStock: false },
  'wa-oos-1':   { id: 'wa-oos-1',   name: 'Pearl Headband',              brand: 'Kekimoro', price: 49.00,  image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#FFFFFF', '#C0C0C0'], inStock: false },
  'wa-oos-2':   { id: 'wa-oos-2',   name: 'Tortoise Shell Sunglasses',   brand: 'Kekimoro', price: 75.00,  image: 'https://images.unsplash.com/photo-1577803645773-f96470509666?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#5C3A1E', '#000000'], inStock: false },
  'mc-oos-1':   { id: 'mc-oos-1',   name: 'Leather Biker Jacket',        brand: 'Kekimoro', price: 395.00, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#000000', '#5C3A1E'], inStock: false },
  'mc-oos-2':   { id: 'mc-oos-2',   name: 'Cashmere Rollneck Sweater',   brand: 'Kekimoro', price: 219.00, image: 'https://images.unsplash.com/photo-1625910513663-8a9e43d85943?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#C4A882', '#808080', '#1B3A5C'], inStock: false },
  'ms-oos-1':   { id: 'ms-oos-1',   name: 'Suede Chukka Boots',         brand: 'Kekimoro', price: 175.00, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#C4A882', '#5C3A1E'], inStock: false },
  'ms-oos-2':   { id: 'ms-oos-2',   name: 'Woven Leather Sandals',      brand: 'Kekimoro', price: 115.00, image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#C4A882', '#000000'], inStock: false },
  'mb-oos-1':   { id: 'mb-oos-1',   name: 'Waxed Canvas Duffle Bag',     brand: 'Kekimoro', price: 265.00, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#36454F', '#5C3A1E'], inStock: false },
  'mb-oos-2':   { id: 'mb-oos-2',   name: 'Perforated Leather Backpack', brand: 'Kekimoro', price: 319.00, image: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#000000', '#5C3A1E'], inStock: false },
  'ma-oos-1':   { id: 'ma-oos-1',   name: 'Chronograph Pilot Watch',     brand: 'Kekimoro', price: 445.00, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#000000', '#C0C0C0'], inStock: false },
  'ma-oos-2':   { id: 'ma-oos-2',   name: 'Monogrammed Card Wallet',     brand: 'Kekimoro', price: 115.00, image: 'https://images.unsplash.com/photo-1627123424574-724758594913?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#5C3A1E', '#000000'], inStock: false },
  'na-oos-1':   { id: 'na-oos-1',   name: 'Sheer Ruffle Midi Dress',     brand: 'Kekimoro', price: 135.00, image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#FFFFFF', '#FFB6C1'], badge: 'NEW', inStock: false },
  'na-oos-2':   { id: 'na-oos-2',   name: 'Geometric Leather Loafers',   brand: 'Kekimoro', price: 169.00, image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  colors: ['#000000', '#C4A882'], badge: 'NEW', inStock: false },
  'sale-oos-1': { id: 'sale-oos-1', name: 'Embossed Leather Trench',     brand: 'Kekimoro', price: 459.00, salePrice: 275.40, image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#C4A882', '#000000'], badge: '-40%', inStock: false },
  'sale-oos-2': { id: 'sale-oos-2', name: 'Suede Platform Derby',        brand: 'Kekimoro', price: 235.00, salePrice: 164.50, image: 'https://images.unsplash.com/photo-1518894781321-630e638d0742?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', colors: ['#5C3A1E', '#000000'], badge: '-30%', inStock: false } };

// Stamp a minimal 5-slot gallery for legacy catalog entries so consumers like
// FavoriteCard and llms.txt have something to render — the real per-color
// images and the recommended/special-offers block ids live in OneEntry now,
// loaded on demand by the page that needs them.
function withDefaults(p: CatalogProduct): CatalogProduct {
  return {
    galleryImages: Array(5).fill(p.image),
    ...p,
  };
}

export const PRODUCT_CATALOG: Record<string, CatalogProduct> = Object.fromEntries(
  Object.entries(_CATALOG).map(([id, p]) => [id, withDefaults(p)])
);

// Re-export so callers can import hexToColorName from one convenient place
export { hexToColorName } from '../utils/colorNames';
