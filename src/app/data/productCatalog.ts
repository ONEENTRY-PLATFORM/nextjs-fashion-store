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
  /** Family stock from OE's `stockqty` attribute. Snapshotted into
   *  `CartItem.stockLimit` at add-time so the cart reducer clamps the
   *  quantity at real inventory. `undefined` when the tenant tracks
   *  availability via `statusIdentifier` only. */
  stock?: number;
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
  /** OE gender bucket (`W`/`M`/`U`) — used to stamp Recently-Viewed items so
   *  downstream gender-aware carousels can score them without re-fetching. */
  gender?: string;
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
  /** Variant stock from OE's `stockqty` attribute. Snapshotted into
   *  `CartItem.stockLimit` when the shopper adds this variant to cart so
   *  the reducer clamps quantity at real inventory. `undefined` when the
   *  tenant tracks availability via `statusIdentifier` only. */
  stock?: number;
  /** Per-variant sale price / regular price / SKU / imagery so the PDP can
   *  swap them in when the shopper picks a colour or size. */
  price?: number;
  /** Per-variant discounted price when an OE `Discounts` rule
   *  (`type: DISCOUNT`, `applicability: TO_PRODUCT`) matches this
   *  variant's id or category. Snapshotted at load time by
   *  `applyProductDiscount` — see `src/lib/oneentry/discounts/product-discount.ts`.
   *  `undefined` when no active rule applies. */
  salePrice?: number;
  sku?: string;
  image?: string;
  images?: string[];
  descriptionHtml?: string;
  /** OE availability flag. `coming_soon` renders as "Pre-order" and still
   *  lets the customer add to cart; `out_of_stock` disables purchase. */
  statusIdentifier?: string;
}

// Product data lives in OneEntry — pull it via
// `src/lib/oneentry/catalog/products.ts` (`loadProducts`, `loadProductById`,
// `loadFullCatalog`). This file intentionally exports only type contracts +
// the `hexToColorName` utility. No static product datasets remain.
export { hexToColorName } from '../utils/colorNames';
