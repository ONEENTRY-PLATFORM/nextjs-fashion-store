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
  const inStock = p.statusIdentifier === 'out_of_stock' ? false : p.stock > 0 || p.statusIdentifier === '' ? true : true;
  return {
    id: String(p.id),
    name: p.title,
    brand: p.brand || undefined,
    price: formatPrice(p.price),
    image: p.preview,
    colorImages: p.images.slice(0, p.colors.length || 1),
    label: label || undefined,
    colors: p.colors,
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
    gender: p.gender || undefined,
  };
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
  return {
    id: String(p.id),
    name: p.title,
    brand: p.brand,
    price: p.price,
    image: p.preview,
    colors: p.colors.map(colorToHex),
    colorImages: p.images.length >= p.colors.length ? p.images.slice(0, p.colors.length) : undefined,
    inStock: p.stock > 0 && p.statusIdentifier !== 'out_of_stock',
    galleryImages: p.images.length > 0 ? p.images : undefined,
    sizeOptions: p.sizes.map((s) => ({ label: s, available: true })),
    // The detail accordion expects an array of short bullets — `productDetails`
    // already comes from the OE `details_5` list. The long description is
    // separately surfaced as `descriptionHtml` so the PDP can render its full
    // body.
    productDetails: p.productDetails.length > 0 ? p.productDetails : undefined,
    descriptionHtml: p.descriptionHtml || undefined,
    careInstructions: p.careInstructions.length > 0 ? p.careInstructions : undefined,
    specs: specs.length > 0 ? specs : undefined,
    material: p.materials[0],
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
