import type { CatalogProduct } from './products';
import type { Product } from '../../../app/components/ProductCard';
import type { CatalogProduct as PdpCatalogProduct } from '../../../app/data/productCatalog';
import { CURRENCY } from '../../../app/data/currencyConfig';

const COLOR_NAME_TO_HEX: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', grey: '#808080', gray: '#808080',
  red: '#DA1E1E', blue: '#1B3A5C', navy: '#1B3A5C', green: '#16A34A',
  brown: '#8B4513', camel: '#C19A6B', beige: '#D2B48C',
  burgundy: '#800020', pink: '#FFC0CB', purple: '#7C3AED',
  yellow: '#FFD700', orange: '#FFA500', cream: '#FFFDD0',
  ivory: '#FFFFF0', khaki: '#BDB76B', olive: '#808000',
  multicolour: '#7C3AED', multicolor: '#7C3AED', silver: '#C0C0C0',
  gold: '#FFD700', taupe: '#8B7355',
};

const colorToHex = (name: string): string =>
  COLOR_NAME_TO_HEX[name.toLowerCase().trim()] ?? '#999999';

const TAG_TO_LABEL: Record<string, string> = {
  Sale: 'SALE',
  New: 'NEW',
  Bestseller: 'BESTSELLER',
};

/**
 * Map an OneEntry product to the storefront `Product` shape used by
 * ProductCard / CatalogTemplate. UI-only fields (clothingType, fit, collar
 * etc.) come from the mock catalog and aren't on OE products — those stay
 * undefined and the corresponding filter groups simply count zero.
 */
export function adaptCatalogProductToUiProduct(p: CatalogProduct): Product {
  const formatPrice = (n: number): string => CURRENCY.format(n);
  const label = TAG_TO_LABEL[p.tag] ?? p.tag;
  const variantHasStock = (v: { stock: number; statusIdentifier: string }) =>
    v.stock > 0 || v.statusIdentifier !== 'out_of_stock';
  const inStock = p.statusIdentifier !== 'out_of_stock';
  // Slim variant descriptors — carry only the fields ProductCard / QuickView
  // need to swap when the shopper flips through colors or sizes.
  const variants = p.variants?.map((v) => ({
    id: String(v.id),
    colors: v.colors,
    sizes: v.sizes,
    price: formatPrice(v.price),
    sku: v.sku,
    image: v.preview,
    images: v.images,
    inStock: variantHasStock(v),
  }));
  // Per-swatch availability: a colour is buyable when at least one linked
  // variant carrying it has stock. Without this every swatch is clickable and
  // the shopper only learns a colour is sold out after opening the PDP.
  const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
  const colorStock = hasVariants
    ? p.colors.map((c) => p.variants!.some((v) => v.colors.includes(c) && variantHasStock(v)))
    : undefined;
  return {
    id: String(p.id),
    name: p.title,
    brand: p.brand || undefined,
    price: formatPrice(p.price),
    image: p.preview,
    colorImages: p.images.slice(0, p.colors.length || 1),
    label: label || undefined,
    colors: p.colors,
    colorStock,
    sizes: p.sizes,
    inStock,
    season: p.season || undefined,
    material: p.materials[0],
    style: p.styles[0],
    brandCountry: p.country || undefined,
    fit: p.fit || undefined,
    liningMaterial: p.liningMaterial || undefined,
    insulation: p.insulation || undefined,
    productDetails: p.productDetails.length > 0 ? p.productDetails : undefined,
    careInstructions: p.careInstructions.length > 0 ? p.careInstructions : undefined,
    // Fall back to the category path (`/women/...` vs `/men/...`) when the
    // OE `gender` attribute is left blank — otherwise "unisex-by-omission"
    // items slip into the opposite gender's carousels/filters.
    gender: p.gender || genderFromCategoryPath(p.categories[0]) || undefined,
    ...(variants && variants.length > 0 && { variants }),
  };
}

function genderFromCategoryPath(path: string | undefined): 'W' | 'M' | '' {
  const p = (path ?? '').toLowerCase();
  if (p.startsWith('/women') || p.includes('/women/') || p.startsWith('home2/women')) return 'W';
  if (p.startsWith('/men') || p.includes('/men/') || p.startsWith('home2/men')) return 'M';
  return '';
}

/** Infer the Sale-page bucket from an OneEntry category path. */
export function saleCategoryFor(p: CatalogProduct): string {
  const path = (p.categories[0] ?? '').toLowerCase();
  if (path.startsWith('/women/women_clothing')) return "Women's Clothing";
  if (path.startsWith('/men/men_clothing')) return "Men's Clothing";
  if (path.startsWith('/women/women_shoes')) return "Women's Shoes";
  if (path.startsWith('/men/men_shoes')) return "Men's Shoes";
  if (path.startsWith('/women/women_bags') || path.startsWith('/men/men_bags')) return 'Bags';
  if (path.startsWith('/women/women_accessories') || path.startsWith('/men/men_accessories')) return 'Accessories';
  return 'Other';
}

/** Infer the New-Arrivals bucket from an OneEntry category path. */
export function newArrivalCategoryFor(p: CatalogProduct): 'Clothing' | 'Shoes' | 'Accessories' {
  const path = (p.categories[0] ?? '').toLowerCase();
  if (path.includes('_shoes')) return 'Shoes';
  if (path.includes('_bags') || path.includes('_accessories')) return 'Accessories';
  return 'Clothing';
}

/**
 * Map an OneEntry product to the rich PDP CatalogProduct shape used by
 * ProductDetailPage. Fields the storefront supports but OE doesn't store
 * (reviews, sizeOptions.available per-size, colorStock, recommendedId,
 * specialOffersId) stay undefined and the UI uses its DEFAULT_* fallbacks.
 */
export function adaptCatalogProductToPdpProduct(p: CatalogProduct): PdpCatalogProduct {
  const specs = buildProductSpecs(p);
  // Per-colour / per-size availability derived from the variant family. A
  // colour is available if at least one linked variant carrying it has
  // stock. Per-size availability is refined client-side by PDP based on the
  // currently selected colour — here we compute the colour-agnostic default.
  const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
  // Many OE tenants track availability through `statusIdentifier` alone and
  // never write to the numeric `stock` field. Treat a variant as buyable
  // whenever either the count is positive OR the status flag isn't
  // explicitly `out_of_stock`.
  const variantHasStock = (v: { stock: number; statusIdentifier: string }) =>
    v.stock > 0 || v.statusIdentifier !== 'out_of_stock';
  const colorStock = hasVariants
    ? p.colors.map((c) => p.variants!.some((v) => v.colors.includes(c) && variantHasStock(v)))
    : undefined;
  const sizeAvailability = hasVariants
    ? new Map(p.sizes.map((s) => [s, p.variants!.some((v) => v.sizes.includes(s) && variantHasStock(v))]))
    : null;
  // Slim variant list for PDP so it can recompute size availability per the
  // currently selected colour. `hex` mapping happens here so the client
  // matches against the same colour representation the swatches render.
  const pdpVariants = hasVariants
    ? p.variants!.map((v) => ({
        id: String(v.id),
        colors: v.colors.map(colorToHex),
        sizes: v.sizes,
        inStock: variantHasStock(v),
        price: v.price,
        sku: v.sku,
        image: v.preview,
        images: v.images,
        descriptionHtml: v.descriptionHtml,
        statusIdentifier: v.statusIdentifier,
      }))
    : undefined;
  return {
    id: String(p.id),
    name: p.title,
    brand: p.brand,
    price: p.price,
    image: p.preview,
    colors: p.colors.map(colorToHex),
    colorImages: p.images.length >= p.colors.length ? p.images.slice(0, p.colors.length) : undefined,
    colorStock,
    // OE tenants often track availability through `statusIdentifier` alone
    // and leave the numeric stock field at 0. Accept either signal so a
    // status-only product doesn't render as universally out-of-stock.
    inStock: p.stock > 0 || p.statusIdentifier !== 'out_of_stock',
    galleryImages: p.images.length > 0 ? p.images : undefined,
    sizeOptions: p.sizes.map((s) => ({ label: s, available: sizeAvailability ? sizeAvailability.get(s) ?? true : true })),
    // The detail accordion expects an array of short bullets — `productDetails`
    // already comes from the OE `details_5` list. The long description is
    // separately surfaced as `descriptionHtml` so the PDP can render its full
    // body.
    productDetails: p.productDetails.length > 0 ? p.productDetails : undefined,
    descriptionHtml: p.descriptionHtml || undefined,
    careInstructions: p.careInstructions.length > 0 ? p.careInstructions : undefined,
    specs: specs.length > 0 ? specs : undefined,
    material: p.materials[0],
    // Stamp gender (OE attr → category-path fallback) so PDP can pass it to
    // Recently-Viewed → gender-aware carousels don't have to guess later.
    gender: p.gender || genderFromCategoryPath(p.categories[0]) || undefined,
    variants: pdpVariants,
  };
}

/** Build a per-product Specifications list from OE attributes. Skips empty or
 *  whitespace-only values so empty fields don't leak into the PDP. */
function buildProductSpecs(p: CatalogProduct): { label: string; value: string }[] {
  const rows: Array<[string, string | undefined]> = [
    ['Composition', p.materials.join(', ')],
    ['Lining', p.liningMaterial],
    ['Fit', p.fit],
    ['Style', p.styles[0]],
    ['Season', p.season],
    ['Brand origin', p.country],
    ['SKU', p.sku],
  ];
  return rows
    .map(([label, value]) => ({ label, value: (value ?? '').trim() }))
    .filter((row) => row.value.length > 0);
}

/** Map a catalog slug (e.g. "women-clothing") to its OneEntry category path. */
export function catalogKeyToCategoryPath(catalogKey: string): string | null {
  const map: Record<string, string> = {
    'women-clothing': '/women/women_clothing',
    'women-shoes': '/women/women_shoes',
    'women-bags': '/women/women_bags',
    'women-accessories': '/women/women_accessories',
    'men-clothing': '/men/men_clothing',
    'men-shoes': '/men/men_shoes',
    'men-bags': '/men/men_bags',
    'men-accessories': '/men/men_accessories',
  };
  return map[catalogKey] ?? null;
}
