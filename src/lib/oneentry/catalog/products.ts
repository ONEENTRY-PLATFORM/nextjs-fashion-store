import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { REVALIDATE_PRODUCT } from '@/lib/isr';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { applyProductDiscount, loadProductDiscounts } from '@/lib/oneentry/discounts/product-discount';
import { blurByUrl, getApi, getApiSafe, getImages, isError, type OeImage } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { logCaught } from '@/lib/oneentry/log';
import { withTiming } from '@/lib/oneentry/profiling';
import type { Lang } from '@/lib/oneentry/system-text';

import type { CatalogFilters } from './filters';
import { PRODUCTS_TAG, productTag } from './product-tags';

/** Normalized OneEntry product for the storefront. */
export interface CatalogProduct {
  id: number;
  title: string;
  description: string;
  statusIdentifier: string;
  price: number;
  /** Discounted price when an OE `Discounts` rule (`type: DISCOUNT`, `applicability: TO_PRODUCT`) matches this product by id or category. */
  salePrice?: number;
  currency: string;
  sku: string;
  brand: string;
  colors: string[];
  sizes: string[];
  materials: string[];
  styles: string[];
  gender: 'W' | 'M' | 'U' | '';
  tag: string;
  /** Total stock units — sourced exclusively from OE's `stockqty` attribute. */
  stock: number;
  season: string;
  country: string;
  categories: string[];
  images: string[];
  /** First image — preview thumbnail. */
  preview: string;
  /** Blur data URI per image URL, for `next/image`'s `blurDataURL`. Keyed by URL rather than index so the adapters can slice `images` freely. */
  imageBlurs: Record<string, string>;
  /** Clothing-only extras coming from the OE attribute set. */
  fit: string;
  liningMaterial: string;
  /** Insulation filler (`insulation_17` list value) — used by the catalog-level filter row. */
  insulation: string;
  productDetails: string[];
  /** Long-form description (`productdescription_6`). */
  descriptionHtml: string;
  /** Care symbols / instructions (`careinstructions_18` list). */
  careInstructions: string[];
  /** Raw string values for every OE attribute marker starting with `discount_` on this product. */
  discountAttributes: Record<string, string>;
  /** All variant products in the same title-group (same product, different color/size combinations). */
  variants?: CatalogProductVariant[];
  /** Product ids explicitly linked in OE admin ("related products"). */
  relatedIds: number[];
}

/** Slim descriptor of one variant inside a product's title-group. */
export interface CatalogProductVariant {
  id: number;
  colors: string[];
  sizes: string[];
  price: number;
  /** Discounted price when an OE `Discounts` rule (`type: DISCOUNT`, `applicability: TO_PRODUCT`) matches THIS variant's id or category. */
  salePrice?: number;
  sku: string;
  preview: string;
  images: string[];
  /** Blur data URI per image URL — see the same field on the product above. */
  imageBlurs: Record<string, string>;
  stock: number;
  /** Copied from the raw product so the storefront can fall back to the status flag when the merchant doesn't track the numeric stock field. */
  statusIdentifier: string;
  descriptionHtml: string;
}

/** One breadcrumb derived from an OE category path. */
export interface CategoryBreadcrumb {
  /** Visible label, e.g. `Rubber Boots`. */
  name: string;
  /** Storefront destination, omitted when the segment has no page a shopper can reach. */
  href?: string;
}

/** Capitalize an OE url segment: `rubber_boots` → `Rubber Boots`. */
function segmentToLabel(segment: string): string {
  // Drop the redundant gender prefix on subcategories (`women_clothing` → `Clothing`) so the visible label matches storefront navigation labels.
  const trimmed = segment
    .replace(/^(women|men)_/, '')
    .replace(/[-_]/g, ' ')
    .trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

/** Convert an OE category path like `/women/women_shoes/rubber_boots` into navigable PDP breadcrumbs. The gender segment has no route of its own and links to `genderHref`. */
export function categoryPathToBreadcrumbs(path: string | undefined, genderHref?: string): CategoryBreadcrumb[] {
  if (!path) return [];
  const segments = path.split('/').filter(Boolean);
  const gender = segments[0] ?? '';
  const sectionHref = categoryPathToViewAllHref(path);
  const hasSection = sectionHref !== '/';

  return segments
    .map((segment, i): CategoryBreadcrumb | null => {
      const name = segmentToLabel(segment);
      if (!name) return null;
      // Two adjacent crumbs pointing at the same page read as a mistake, so the gender keeps its href only when it differs from the section's.
      if (i === 0) return genderHref && gender && genderHref !== sectionHref ? { name, href: genderHref } : { name };
      if (i === 1) return hasSection ? { name, href: sectionHref } : { name };
      // A leaf category has no page of its own — narrow the section page with the filter the catalog route parses out of `?category=`.
      return hasSection ? { name, href: `${sectionHref}?category=${encodeURIComponent(segment)}` } : { name };
    })
    .filter((crumb): crumb is CategoryBreadcrumb => crumb !== null);
}

/** Derives the "View all in this category" storefront href from an OE taxonomy path. */
export function categoryPathToViewAllHref(categoryPath: string | undefined): string {
  const seg = (categoryPath ?? '').split('/').filter(Boolean);
  const gender = seg[0];
  const top = (seg[1] ?? '').replace(/^(women|men)_/, '');
  if (gender && top) return `/${gender}/${top}`;
  return '/';
}

export interface LoadProductsOptions {
  /** OE category path like "/women/women_outerwear/coats". */
  categoryPath?: string;
  /** Filter products tagged with any of these lable_23 values (e.g. "Sale", "New"). */
  tags?: string[];
  /** Explicit ids — pulled via list endpoint with id filter. */
  ids?: number[];
  /** Collapse size/color variants into a single representative per product. */
  unique?: boolean;
  limit?: number;
  offset?: number;
  sortKey?: 'position' | 'date' | 'price' | 'title';
  sortOrder?: 'ASC' | 'DESC';
  lang?: Lang;
}

export interface LoadProductsResult {
  total: number;
  items: CatalogProduct[];
  fromCms: boolean;
}

type RawAttr = {
  type?: string;
  value?: unknown;
};

type RawProduct = {
  id?: number;
  sku?: string;
  price?: number;
  categories?: string[];
  statusIdentifier?: string;
  localizeInfos?: Record<string, { title?: string }> | { title?: string };
  attributeValues?: Record<string, Record<string, RawAttr>> | Record<string, RawAttr>;
  /** OneEntry admin lets a merchant link products together as siblings (colour or size variants of the same model). */
  relatedIds?: number[];
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const asNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const listValues = (attr: RawAttr | undefined): string[] => {
  if (!attr) return [];
  const v = attr.value;
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      const cell = item as { title?: unknown; value?: unknown };
      return (asString(cell.value) || asString(cell.title)).trim();
    })
    .filter((s) => s.length > 0);
};

const stringValue = (attr: RawAttr | undefined): string => {
  if (!attr) return '';
  if (typeof attr.value === 'string') return attr.value;
  // OE marker `type: integer` / `type: float` ships `value` as a raw number (not a string).
  if (typeof attr.value === 'number' && Number.isFinite(attr.value)) return String(attr.value);
  if (Array.isArray(attr.value)) {
    const first = attr.value[0] as { plainValue?: unknown; value?: unknown; title?: unknown } | undefined;
    return asString(first?.plainValue) || asString(first?.value) || asString(first?.title);
  }
  return '';
};

/** Same shape as `stringValue` but prefers `htmlValue` so we can surface rich text content from the OE editor. */
const richTextValue = (attr: RawAttr | undefined): string => {
  if (!attr) return '';
  if (Array.isArray(attr.value)) {
    const first = attr.value[0] as
      { htmlValue?: unknown; plainValue?: unknown; mdValue?: unknown; value?: unknown; title?: unknown } | undefined;
    const html = asString(first?.htmlValue).trim();
    if (html) return html;
    const md = asString(first?.mdValue).trim();
    if (md) return md;
    return asString(first?.plainValue) || asString(first?.value) || asString(first?.title);
  }
  if (typeof attr.value === 'string') return attr.value;
  return '';
};

/** Gallery URLs for an OE `groupOfImages` / multi-file attribute. */
const imagesValue = (attr: RawAttr | undefined): OeImage[] => getImages(attr?.value);

const pickAttributes = (raw: RawProduct, lang: Lang): Record<string, RawAttr> => {
  const attrs = raw.attributeValues ?? {};
  // OE list endpoint returns `attributeValues: { en_US: {...} }`; some other endpoints return the inner object flat.
  const wrapped = attrs as Record<string, Record<string, RawAttr>>;
  if (wrapped[lang] && typeof wrapped[lang] === 'object') return wrapped[lang];
  return attrs as Record<string, RawAttr>;
};

const titleOf = (raw: RawProduct, lang: Lang): string => {
  const li = raw.localizeInfos ?? {};
  const flat = li as { title?: string };
  if (typeof flat.title === 'string') return flat.title;
  const wrapped = (li as Record<string, { title?: string }>)[lang];
  return asString(wrapped?.title);
};

const GENDER_MAP: Record<string, CatalogProduct['gender']> = {
  W: 'W',
  WOMEN: 'W',
  FEMALE: 'W',
  M: 'M',
  MEN: 'M',
  MALE: 'M',
  U: 'U',
  UNISEX: 'U',
};

/** Attribute markers in OE carry a numeric suffix (`brand_6`, `brand_7`) that differs per attribute set. */
const findAttr = (attrs: Record<string, RawAttr>, prefixes: string[]): RawAttr | undefined => {
  for (const prefix of prefixes) {
    if (attrs[prefix]) return attrs[prefix];
  }
  for (const key of Object.keys(attrs)) {
    const root = key.replace(/_\d+$/, '');
    if (prefixes.includes(root)) return attrs[key];
  }
  return undefined;
};

// OE ships `home/women/women_clothing/dresses`; the storefront expects `/women/women_clothing/dresses`.
function normalizeCategoryPath(raw: string): string {
  const trimmed = raw.replace(/^\/+/, '').replace(/^home\//, '');
  return `/${trimmed}`;
}

const normalize = (raw: RawProduct, lang: Lang): CatalogProduct => {
  const attrs = pickAttributes(raw, lang);
  // Real attribute markers in the live tenant (snapshot from /inspect-api): gallery, brand, colors, sizes, material, style, label, season, brand_country, fit, lining_material, description, sku, title, currency, price, tags.
  const gallery = imagesValue(findAttr(attrs, ['gallery', 'pictures']));
  const images = gallery.map((img) => img.url);
  const brand = listValues(findAttr(attrs, ['brand']))[0] ?? '';
  const colors = listValues(findAttr(attrs, ['colors', 'color']));
  const sizes = listValues(findAttr(attrs, ['sizes', 'size']));
  const materials = listValues(findAttr(attrs, ['material']));
  const styles = listValues(findAttr(attrs, ['style']));
  const tags = listValues(findAttr(attrs, ['label', 'lable', 'tags']));
  const seasons = listValues(findAttr(attrs, ['season']));
  const countries = listValues(findAttr(attrs, ['brand_country', 'country']));
  const fit = listValues(findAttr(attrs, ['fit', 'fitrise']))[0] ?? '';
  const liningMaterial = listValues(findAttr(attrs, ['lining_material', 'lining']))[0] ?? '';
  const insulation = listValues(findAttr(attrs, ['insulation']))[0] ?? '';
  const productDetails = listValues(findAttr(attrs, ['details']));
  const careInstructions = listValues(findAttr(attrs, ['careinstructions', 'care']));
  // Stock is tracked ONLY by the `stockqty` attribute per merchant decision.
  const stockRaw = stringValue(findAttr(attrs, ['stockqty']));
  const priceRaw = stringValue(findAttr(attrs, ['price']));
  const description = stringValue(findAttr(attrs, ['description', 'productdescription']));
  const descriptionHtml = richTextValue(findAttr(attrs, ['description', 'productdescription']));
  const skuAttr = stringValue(findAttr(attrs, ['sku']));
  const productName = stringValue(findAttr(attrs, ['title', 'productname']));
  const genderRaw = (listValues(findAttr(attrs, ['gender']))[0] ?? '').toUpperCase();
  const currencyAttr = stringValue(findAttr(attrs, ['currency']));
  // Snapshot every attribute whose marker starts with `discount_` — these are the campaign flags OE `Discounts` rules key on via `ATTRIBUTE` conditions.
  const discountAttributes: Record<string, string> = {};
  for (const key of Object.keys(attrs)) {
    if (!key.startsWith('discount_') && !key.startsWith('discount')) continue;
    const rawValue = stringValue(attrs[key]);
    const cleaned = rawValue.trim();
    if (cleaned) discountAttributes[key] = cleaned;
  }
  return {
    id: raw.id ?? 0,
    title: productName || titleOf(raw, lang),
    description,
    statusIdentifier: asString(raw.statusIdentifier),
    price: priceRaw ? asNumber(priceRaw) : asNumber(raw.price),
    currency: currencyAttr || 'USD',
    sku: skuAttr || asString(raw.sku),
    brand,
    colors,
    sizes,
    materials,
    styles,
    gender: GENDER_MAP[genderRaw] ?? '',
    tag: tags[0] ?? '',
    stock: asNumber(stockRaw),
    season: seasons[0] ?? '',
    country: countries[0] ?? '',
    categories: Array.isArray(raw.categories) ? raw.categories.map(normalizeCategoryPath) : [],
    images,
    preview: images[0] ?? '',
    imageBlurs: blurByUrl(gallery),
    descriptionHtml,
    careInstructions,
    fit,
    liningMaterial,
    insulation,
    productDetails,
    relatedIds: Array.isArray(raw.relatedIds)
      ? raw.relatedIds.filter((n): n is number => typeof n === 'number' && n > 0)
      : [],
    discountAttributes,
  };
};

interface ListResponse {
  total?: number;
  items?: RawProduct[];
}

/** Pull every product variant in one POST and cache it for the request. */
// Process-wide TTL cache.
const FULL_CATALOG_TTL_MS = 5 * 60 * 1000;
const fullCatalogCache = new Map<Lang, { at: number; value: CatalogProduct[] }>();
const fullCatalogInflight = new Map<Lang, Promise<CatalogProduct[] | null>>();

async function fetchFullCatalog(lang: Lang): Promise<CatalogProduct[] | null> {
  const api = getApiSafe();
  if (!api) return null;
  // Bypass `unstable_cache` here.
  try {
    const result = await getApi().Products.getProducts(
      [] as unknown as Parameters<ReturnType<typeof getApi>['Products']['getProducts']>[0],
      lang,
      { offset: 0, limit: 2000 } as unknown as Parameters<ReturnType<typeof getApi>['Products']['getProducts']>[2],
    );
    if (!result || isError(result)) return null;
    const items = (result as unknown as ListResponse).items ?? [];
    const normalized = items.map((r) => normalize(r, lang));
    // Optimistically compute a client-side `salePrice` from the OE Discounts rules — this is what powers the catalog / PDP strike-through UX.
    const rules = await loadProductDiscounts();
    if (rules.length > 0) {
      for (const p of normalized) {
        const sp = applyProductDiscount(p, rules);
        if (sp !== undefined) p.salePrice = sp;
      }
    }
    return normalized;
  } catch (err) {
    logCaught(`products.fetchFullCatalog(${lang})`, err);
    return null;
  }
}

const loadFullCatalog = cache(async (lang: Lang): Promise<CatalogProduct[] | null> => {
  const now = Date.now();
  const cached = fullCatalogCache.get(lang);
  if (cached && now - cached.at < FULL_CATALOG_TTL_MS) return cached.value;
  const inflight = fullCatalogInflight.get(lang);
  if (inflight) return inflight;
  const p = fetchFullCatalog(lang)
    .then((value) => {
      // Only cache successful fetches — a null (outage) shouldn't lock in for 5 minutes; the next request should retry.
      if (value !== null) fullCatalogCache.set(lang, { at: Date.now(), value });
      return value;
    })
    .finally(() => {
      fullCatalogInflight.delete(lang);
    });
  fullCatalogInflight.set(lang, p);
  return p;
});

/** Group variants into unique products. */
function aggregateByName(items: CatalogProduct[], allById: Map<number, CatalogProduct>): CatalogProduct[] {
  const groups = new Map<string, CatalogProduct[]>();
  for (const p of items) {
    const key = p.title || `id:${p.id}`;
    const arr = groups.get(key);
    if (arr) arr.push(p);
    else groups.set(key, [p]);
  }
  const out: CatalogProduct[] = [];
  const isVariantBuyable = (v: { stock: number; statusIdentifier: string }) =>
    v.stock > 0 || v.statusIdentifier !== 'out_of_stock';
  for (const group of groups.values()) {
    // Two variant sources: (1) title-group siblings (already in `group`), (2) products the OE admin explicitly linked via `relatedIds`. Merge them into a single deduplicated set so the storefront sees one "family" of colours/sizes per product.
    const seen = new Set<number>();
    const family: CatalogProduct[] = [];
    const push = (p: CatalogProduct | undefined) => {
      if (!p || seen.has(p.id)) return;
      seen.add(p.id);
      family.push(p);
    };
    for (const p of group) push(p);
    for (const p of group) for (const rid of p.relatedIds) push(allById.get(rid));

    // Prefer a buyable variant as the card's representative so its image, colour swatch, and price come from something the shopper can actually add to cart.
    const rep = family.find(isVariantBuyable) ?? family[0];

    const colors = new Set<string>();
    const sizes = new Set<string>();
    let familyStock = 0;
    let anyBuyable = false;
    for (const v of family) {
      for (const c of v.colors) colors.add(c);
      for (const s of v.sizes) sizes.add(s);
      familyStock = Math.max(familyStock, v.stock);
      if (isVariantBuyable(v)) anyBuyable = true;
    }
    const variants: CatalogProductVariant[] = family.map((v) => ({
      id: v.id,
      colors: v.colors,
      sizes: v.sizes,
      price: v.price,
      ...(v.salePrice !== undefined && { salePrice: v.salePrice }),
      sku: v.sku,
      preview: v.preview,
      images: v.images,
      imageBlurs: v.imageBlurs,
      stock: v.stock,
      statusIdentifier: v.statusIdentifier,
      descriptionHtml: v.descriptionHtml,
    }));
    // Aggregate stock/status so the card treats the whole family as in-stock when any variant is buyable.
    out.push({
      ...rep,
      colors: [...colors],
      sizes: [...sizes],
      variants,
      stock: familyStock,
      statusIdentifier: anyBuyable ? 'in_stock' : rep.statusIdentifier,
    });
  }
  return out;
}

export const loadProducts = withTiming(
  'loadProducts',
  cache(async (opts: LoadProductsOptions = {}): Promise<LoadProductsResult> => {
    const api = getApiSafe();
    if (!api) return { total: 0, items: [], fromCms: false };
    // Route locale by default so a page that lists products does not have to thread `lang` through every call.
    const lang = opts.lang ?? (await currentCmsLocale());
    const limit = opts.limit ?? 30;
    const offset = opts.offset ?? 0;
    const unique = opts.unique ?? true;

    // For id lookups we always need raw variants — return the variant rows.
    if (opts.ids && opts.ids.length > 0) {
      const all = await loadFullCatalog(lang);
      if (all === null) return { total: 0, items: [], fromCms: false };
      const set = new Set(opts.ids);
      const filtered = all.filter((p) => set.has(p.id));
      return { total: filtered.length, items: filtered.slice(offset, offset + limit), fromCms: true };
    }

    const initial = await loadFullCatalog(lang);
    if (initial === null) return { total: 0, items: [], fromCms: false };
    let all = initial;
    if (opts.categoryPath) {
      const needle = opts.categoryPath.toLowerCase();
      all = all.filter((p) => p.categories.some((c) => c.toLowerCase().startsWith(needle)));
    }
    if (opts.tags && opts.tags.length > 0) {
      const tagSet = new Set(opts.tags.map((t) => t.toLowerCase()));
      all = all.filter((p) => tagSet.has(p.tag.toLowerCase()));
    }
    if (unique) {
      const byId = new Map(initial.map((p) => [p.id, p]));
      all = aggregateByName(all, byId);
    }
    return {
      total: all.length,
      items: all.slice(offset, offset + limit),
      fromCms: true,
    };
  }),
);

// Targeted single-product fetch — replaces a full 2000-item catalog dump (~30 MB) with a single OE call that returns the requested product only.
// `unstable_cache` freezes its tags at construction, so the per-product tag needs one instance per id; the cache itself still keys on `keyParts`.
const cachedGetProductById = (id: number) =>
  unstable_cache(
    async (lang: string): Promise<RawProduct | null> => {
      const api = getApiSafe();
      if (!api) return null;
      const result = await getApi().Products.getProductById(id, lang);
      if (isError(result)) return null;
      return result as unknown as RawProduct;
    },
    ['oe-product-by-id', String(id)],
    { revalidate: REVALIDATE_PRODUCT, tags: [PRODUCTS_TAG, productTag(id)] },
  );

// Related products via OE's dedicated endpoint (linked in admin panel).
const cachedGetRelated = (id: number) =>
  unstable_cache(
    async (lang: string): Promise<RawProduct[]> => {
      const api = getApiSafe();
      if (!api) return [];
      const result = await getApi().Products.getRelatedProductsById(id, lang);
      if (isError(result)) return [];
      const arr = Array.isArray(result) ? result : ((result as unknown as { items?: RawProduct[] })?.items ?? []);
      return (arr as RawProduct[]) ?? [];
    },
    ['oe-related-products', String(id)],
    { revalidate: REVALIDATE_PRODUCT, tags: [PRODUCTS_TAG, productTag(id)] },
  );

// Batch fetch by ids — used to resolve explicit `relatedIds` the admin set on the product itself (separate from OE's `getRelatedProductsById`).
// Next caps a cache entry at 128 tags, and a wishlist read can ask for more ids than that, so past the cap the entry keeps only the blanket tag.
const MAX_PRODUCT_TAGS = 64;
const cachedGetByIds = (ids: number[]) => {
  const idsCsv = ids.join(',');
  return unstable_cache(
    async (lang: string): Promise<RawProduct[]> => {
      const api = getApiSafe();
      if (!api || !idsCsv) return [];
      const result = await getApi().Products.getProductsByIds(idsCsv, lang);
      if (isError(result)) return [];
      // OE has repeatedly toggled other list endpoints between flat and `{items, total}`.
      if (Array.isArray(result)) return result as RawProduct[];
      const wrapped = (result as unknown as { items?: unknown })?.items;
      return Array.isArray(wrapped) ? (wrapped as RawProduct[]) : [];
    },
    ['oe-products-by-ids', idsCsv],
    {
      revalidate: REVALIDATE_PRODUCT,
      tags: [PRODUCTS_TAG, ...(ids.length <= MAX_PRODUCT_TAGS ? ids.map(productTag) : [])],
    },
  );
};

export const loadProductById = withTiming(
  'loadProductById',
  cache(async (id: number, langArg?: Lang): Promise<CatalogProduct | null> => {
    const lang = langArg ?? (await currentCmsLocale());
    const raw = await cachedGetProductById(id)(lang);
    if (!raw) return null;
    const target = normalize(raw, lang);

    // Reconstruct the family via two targeted requests instead of scanning the whole catalog: (1) OE's `getRelatedProductsById` (admin-linked siblings) and (2) explicit `relatedIds` on the product record.
    const seen = new Set<number>([target.id]);
    const family: CatalogProduct[] = [target];
    const push = (p: CatalogProduct) => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      family.push(p);
    };

    const relatedRaws = await cachedGetRelated(id)(lang);
    for (const r of relatedRaws) {
      if (!r) continue;
      push(normalize(r, lang));
    }

    if (target.relatedIds.length > 0) {
      const missing = target.relatedIds.filter((rid) => !seen.has(rid));
      if (missing.length > 0) {
        const byIdsRaws = await cachedGetByIds(missing)(lang);
        for (const r of byIdsRaws) {
          if (!r) continue;
          push(normalize(r, lang));
        }
      }
    }

    // Same optimistic overlay as `fetchFullCatalog` — powers the PDP strike-through UX.
    const rules = await loadProductDiscounts();
    if (rules.length > 0) {
      for (const p of family) {
        const sp = applyProductDiscount(p, rules);
        if (sp !== undefined) p.salePrice = sp;
      }
    }

    if (family.length === 1) return target;

    const colors = new Set<string>();
    const sizes = new Set<string>();
    let familyStock = 0;
    let anyInStock = false;
    for (const v of family) {
      for (const c of v.colors) colors.add(c);
      for (const s of v.sizes) sizes.add(s);
      familyStock = Math.max(familyStock, v.stock);
      // Some tenants track availability only through `statusIdentifier` and never populate the numeric stock field.
      if (v.stock > 0 || v.statusIdentifier !== 'out_of_stock') anyInStock = true;
    }
    const variants: CatalogProductVariant[] = family.map((v) => ({
      id: v.id,
      colors: v.colors,
      sizes: v.sizes,
      price: v.price,
      sku: v.sku,
      ...(v.salePrice !== undefined && { salePrice: v.salePrice }),
      preview: v.preview,
      images: v.images,
      imageBlurs: v.imageBlurs,
      stock: v.stock,
      statusIdentifier: v.statusIdentifier,
      descriptionHtml: v.descriptionHtml,
    }));
    // Aggregate stock/status so the PDP treats the whole family as in-stock when at least one variant is buyable.
    return {
      ...target,
      colors: [...colors],
      sizes: [...sizes],
      variants,
      stock: familyStock,
      statusIdentifier: anyInStock ? 'in_stock' : target.statusIdentifier,
    };
  }),
);

export const loadProductsByIds = withTiming(
  'loadProductsByIds',
  cache(async (ids: number[], langArg?: Lang): Promise<CatalogProduct[]> => {
    const lang = langArg ?? (await currentCmsLocale());
    if (ids.length === 0) return [];
    const validIds = ids.filter((n) => Number.isFinite(n) && n > 0);
    if (validIds.length === 0) return [];
    // OE's batch endpoint is much cheaper than pulling the whole catalog just to filter it.
    const raws = await cachedGetByIds(validIds)(lang);
    return raws.map((r) => normalize(r, lang));
  }),
);

/** Normalise the two shapes OE returns from product-list endpoints: the flat `IProductsEntity[]` promised by the SDK typings, or the wrapped `{items: IProductsEntity[], total: number}` that some endpoints (notably `/vectorSearch`) actually ship. */
function extractProductIdList(result: unknown): Array<{ id?: number }> {
  if (Array.isArray(result)) return result as Array<{ id?: number }>;
  const wrapped = (result as { items?: unknown })?.items;
  return Array.isArray(wrapped) ? (wrapped as Array<{ id?: number }>) : [];
}

async function vectorSearchIds(text: string, lang: Lang, limit: number): Promise<number[]> {
  const api = getApiSafe();
  if (!api) return [];
  try {
    const result = await getApi().Products.getProductsByVectorSearch({ queryText: text }, lang, 0, limit);
    if (isError(result)) return [];
    // SDK types the result as `IProductsEntity[]`, but `/vectorSearch` ships a `{items, total}` wrapper.
    const items = extractProductIdList(result);
    return items.map((p) => p.id ?? 0).filter((n) => n > 0);
  } catch (err) {
    logCaught(`products.vectorSearchIds("${text}", ${lang})`, err);
    return [];
  }
}

async function quickSearchIds(text: string, lang: Lang): Promise<number[]> {
  const api = getApiSafe();
  if (!api) return [];
  try {
    const result = await getApi().Products.searchProduct(text, lang);
    if (isError(result)) return [];
    // `searchProduct` typed as `IProductsEntity[]`. Tolerate the wrapped `{items, total}` shape too.
    const items = extractProductIdList(result);
    return items.map((p) => p.id ?? 0).filter((n) => n > 0);
  } catch (err) {
    logCaught(`products.quickSearchIds("${text}", ${lang})`, err);
    return [];
  }
}

/** Combined product search. */
export async function searchProducts(
  queryText: string,
  opts: { limit?: number; lang?: Lang } = {},
): Promise<CatalogProduct[]> {
  const text = queryText.trim();
  if (text.length < 2) return [];
  const lang = opts.lang ?? DEFAULT_LOCALE;
  const limit = opts.limit ?? 30;

  const [vectorIds, quickIds] = await Promise.all([vectorSearchIds(text, lang, limit), quickSearchIds(text, lang)]);

  // Vector results first (semantic relevance), then quick results, deduped.
  const orderedIds: number[] = [];
  const seen = new Set<number>();
  for (const id of [...vectorIds, ...quickIds]) {
    if (!seen.has(id)) {
      seen.add(id);
      orderedIds.push(id);
    }
  }
  if (orderedIds.length === 0) return [];

  // Enrich with full product details from the cached catalog (image, price, brand, colors, sizes — none of which the quick endpoint returns).
  const catalog = await loadFullCatalog(lang);
  if (catalog === null) return [];
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const enriched: CatalogProduct[] = orderedIds.flatMap((id) => {
    const p = byId.get(id);
    return p ? [p] : [];
  });

  return aggregateByName(enriched, byId).slice(0, limit);
}

/** @deprecated use `searchProducts` — kept for backwards compatibility. */
export const searchProductsByVector = searchProducts;

/* ────────────────────────────────────────────────────────────────────────
 *  Filtered, paginated catalog fetch — backed by OE attribute filters.
 *  Used by every catalog SSR page so the URL state (`?color=Black&size=M`)
 *  drives a real server-side query instead of pulling 2000 rows and
 *  filtering on the client.
 * ──────────────────────────────────────────────────────────────────────── */

export interface LoadFilteredProductsOptions {
  /** OE catalog page marker (e.g. `women_shoes`). */
  pageUrl?: string;
  /** Category-path prefix (e.g. `/women/women_shoes`). */
  categoryPath?: string;
  filters: CatalogFilters;
  /** 1-based page index. */
  page?: number;
  limit?: number;
  lang?: Lang;
}

export interface LoadFilteredProductsResult {
  total: number;
  items: CatalogProduct[];
  /** Echo of the page index actually used (post-clamping). */
  page: number;
  /** Echo of the limit used. */
  limit: number;
  fromCms: boolean;
}

/** Resolve the storefront `catalogKey` (e.g. `women-shoes`) to the OE catalog page marker (`women_shoes`). */
const CATALOG_KEY_TO_PAGE_URL: Record<string, string> = {
  'women-clothing': 'women_clothing',
  'women-shoes': 'women_shoes',
  'women-bags': 'women_bags',
  'women-accessories': 'women_accessories',
  'men-clothing': 'men_clothing',
  'men-shoes': 'men_shoes',
  'men-bags': 'men_bags',
  'men-accessories': 'men_accessories',
};

export function catalogKeyToPageUrl(catalogKey: string): string | null {
  return CATALOG_KEY_TO_PAGE_URL[catalogKey] ?? null;
}

const eqCI = (a: string, b: string): boolean => a.toLowerCase().trim() === b.toLowerCase().trim();

const anyMatchCI = (selected: string[], values: string[]): boolean =>
  selected.some((sel) => values.some((v) => eqCI(sel, v)));

/** Local filter over normalized catalog products. */
function matchesCatalogFilters(p: CatalogProduct, f: CatalogFilters): boolean {
  if (f.category) {
    // OE `pageUrl` is stored on the category page and duplicated into `p.categories[]` as the trailing path segment.
    const raw = f.category.toLowerCase();
    const slug = raw
      .replace(/&/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const hit = p.categories.some((path) => {
      const segs = path.toLowerCase().split('/').filter(Boolean);
      return segs.includes(raw) || (slug && slug !== raw && segs.includes(slug));
    });
    if (!hit) return false;
  }
  if (f.minPrice !== undefined && p.price < f.minPrice) return false;
  if (f.maxPrice !== undefined && p.price > f.maxPrice) return false;
  if (f.inStockOnly) {
    // Treat missing status as "in stock" so unconfigured products aren't silently hidden in dev.
    if (p.statusIdentifier === 'out_of_stock') return false;
  }
  if (f.colors?.length && !anyMatchCI(f.colors, p.colors)) return false;
  if (f.sizes?.length && !anyMatchCI(f.sizes, p.sizes)) return false;
  if (f.brands?.length && !f.brands.some((b) => eqCI(b, p.brand))) return false;
  if (f.styles?.length && !anyMatchCI(f.styles, p.styles)) return false;
  if (f.materials?.length && !anyMatchCI(f.materials, p.materials)) return false;
  if (f.seasons?.length && !f.seasons.some((s) => eqCI(s, p.season))) return false;
  if (f.fits?.length && !f.fits.some((s) => eqCI(s, p.fit))) return false;
  if (f.liningMaterials?.length && !f.liningMaterials.some((s) => eqCI(s, p.liningMaterial))) return false;
  if (f.brandCountries?.length && !f.brandCountries.some((s) => eqCI(s, p.country))) return false;
  if (f.labels?.length && !f.labels.some((s) => eqCI(s, p.tag))) return false;
  if (f.productDetails?.length && !anyMatchCI(f.productDetails, p.productDetails)) return false;
  if (f.careInstructions?.length && !anyMatchCI(f.careInstructions, p.careInstructions)) return false;
  if (f.insulations?.length && !f.insulations.some((s) => eqCI(s, p.insulation))) return false;
  return true;
}

export const loadFilteredProducts = withTiming('loadFilteredProducts', _loadFilteredProducts);

async function _loadFilteredProducts(opts: LoadFilteredProductsOptions): Promise<LoadFilteredProductsResult> {
  const lang = opts.lang ?? DEFAULT_LOCALE;
  const limit = Math.max(1, opts.limit ?? 24);
  const page = Math.max(1, Math.floor(opts.page ?? opts.filters.page ?? 1));

  const api = getApiSafe();
  if (!api) {
    return { total: 0, items: [], page, limit, fromCms: false };
  }

  const fullCatalog = await loadFullCatalog(lang);
  if (fullCatalog === null) {
    return { total: 0, items: [], page, limit, fromCms: false };
  }
  const byId = new Map(fullCatalog.map((p) => [p.id, p]));
  let all = fullCatalog;

  if (opts.categoryPath) {
    const needle = opts.categoryPath.toLowerCase();
    all = all.filter((p) => p.categories.some((c) => c.toLowerCase().startsWith(needle)));
  }

  all = all.filter((p) => matchesCatalogFilters(p, opts.filters));

  all = aggregateByName(all, byId);

  if (opts.filters.sort === 'price_asc') all = [...all].sort((a, b) => a.price - b.price);
  if (opts.filters.sort === 'price_desc') all = [...all].sort((a, b) => b.price - a.price);

  const offset = (page - 1) * limit;
  return {
    total: all.length,
    items: all.slice(offset, offset + limit),
    page,
    limit,
    fromCms: true,
  };
}
