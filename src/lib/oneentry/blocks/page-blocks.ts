import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import type { Product } from '@/app/components/product/ProductCard';
import { REVALIDATE_BLOCK, REVALIDATE_PRODUCT } from '@/lib/isr';
import { adaptCatalogProductToUiProduct } from '@/lib/oneentry/catalog/adapt';
import { loadProducts, type LoadProductsOptions } from '@/lib/oneentry/catalog/products';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApi, getApiForLang, isError, isOneEntryEnabled } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { withTiming } from '@/lib/oneentry/profiling';

/** Block heading in the rendering locale. */
function blockTitle(
  info: ({ title?: string } & Record<string, { title?: string } | undefined>) | undefined,
  lang: string,
): string {
  const raw = info?.[lang]?.title ?? info?.[DEFAULT_LOCALE]?.title ?? info?.title ?? '';
  return raw.toString().trim();
}

/** Block descriptor returned by `loadPageBlocks`: consumers switch on `type` + `marker`, falling back to `attributeValues` for admin-created blocks. */
export interface PageBlock {
  marker: string;
  type: string;
  title: string;
  /** Position from OE — already used for sorting before return. */
  position: number;
  /** For product-list blocks (`trending_block`, `similar_products_block`, `product_block`) the resolved products. */
  products: Product[];
  /** Raw `attributeValues` from OE. */
  attributeValues?: Record<string, unknown>;
  /** For `slider_block` type. */
  slides?: Array<{ id?: number; attributeValues?: Record<string, unknown> }>;
}

const PRODUCT_BLOCK_TYPES = new Set([
  'trending_block',
  'similar_products_block',
  'product_block',
  // `cart_complement_block` is deliberately NOT here.
]);

/** Cached SDK read of a block by marker. */
const getCachedBlock = unstable_cache(
  async (marker: string, lang: string, limit: number) => {
    const result = await getApi().Blocks.getBlockByMarker(marker, lang, 0, limit);
    if (isError(result)) return null;
    // The SDK typing doesn't expose the enriched `similarProducts`/`products` arrays as raw items with ids.
    return result as unknown as {
      type?: string;
      position?: number;
      quantity?: number;
      localizeInfos?: { title?: string } & Record<string, { title?: string } | undefined>;
      similarProducts?: { items?: Array<{ id?: number }> };
      products?: Array<{ id?: number }>;
      attributeValues?: Record<string, unknown>;
    };
  },
  ['oe-block-by-marker'],
  { revalidate: REVALIDATE_BLOCK, tags: ['oe-block'] },
);

// Trending blocks aren't populated via `getBlockByMarker`.
const getCachedSlides = unstable_cache(
  async (marker: string, lang: string) => {
    // `getSlides` takes no locale argument — the answer comes back in the language the instance was built with, so the locale picks the instance.
    const result = await getApiForLang(lang)?.Blocks.getSlides(marker);
    if (!result) return [] as Array<{ id?: number; attributeValues?: Record<string, unknown> }>;
    if (isError(result)) return [] as Array<{ id?: number; attributeValues?: Record<string, unknown> }>;
    const arr = Array.isArray(result)
      ? result
      : ((result as unknown as { items?: Array<{ id?: number; attributeValues?: Record<string, unknown> }> })?.items ??
        []);
    return arr;
  },
  ['oe-block-slides'],
  { revalidate: REVALIDATE_BLOCK, tags: ['oe-block'] },
);

const getCachedTrending = unstable_cache(
  async (marker: string, lang: string) => {
    const result = await getApi().Blocks.getTrending(marker, lang);
    if (isError(result)) return [] as Array<{ id?: number }>;
    // SDK returns either an array or `{ items }` depending on shape.
    const arr = Array.isArray(result)
      ? result
      : ((result as unknown as { items?: Array<{ id?: number }> })?.items ?? []);
    return arr as Array<{ id?: number }>;
  },
  ['oe-block-trending'],
  { revalidate: REVALIDATE_BLOCK, tags: ['oe-block'] },
);

const getCachedFrequentlyOrdered = unstable_cache(
  async (marker: string, productId: number, lang: string) => {
    const result = await getApi().Blocks.getFrequentlyOrderedProducts(productId, marker, lang);
    if (isError(result)) return null;
    // The SDK types `items` with a rich shape, but for our use we only need `id`. Narrow to that shape.
    return result as unknown as { items?: Array<{ id?: number }> };
  },
  ['oe-block-frequently-ordered'],
  // Product-scoped like the PDP that streams it, so it no longer sets the whole page's expiry.
  { revalidate: REVALIDATE_PRODUCT, tags: ['oe-block'] },
);

// Process-wide in-flight de-duplication for `getCachedFrequentlyOrdered`. `unstable_cache` handles cross-request caching (hits are ~free), but under concurrent load we still saw p95 ≈ 19 s on this loader in perf-dump.
interface FreqOrderedState {
  inflight: Map<string, Promise<{ items?: Array<{ id?: number }> } | null>>;
}
const FREQ_ORDERED_KEY = '__oneentryFrequentlyOrderedInflight__';
type GlobalWithFreqOrdered = typeof globalThis & { [FREQ_ORDERED_KEY]?: FreqOrderedState };
function getFreqOrderedInflight(): FreqOrderedState['inflight'] {
  const g = globalThis as GlobalWithFreqOrdered;
  let s = g[FREQ_ORDERED_KEY];
  if (!s) {
    s = { inflight: new Map() };
    g[FREQ_ORDERED_KEY] = s;
  }
  return s.inflight;
}
async function getFrequentlyOrderedDedup(
  marker: string,
  productId: number,
  lang: string,
): Promise<{ items?: Array<{ id?: number }> } | null> {
  const inflight = getFreqOrderedInflight();
  const key = `${marker}::${productId}::${lang}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = getCachedFrequentlyOrdered(marker, productId, lang).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

const getCachedPageById = unstable_cache(
  async (pageId: number, lang: string) => {
    const result = await getApi().Pages.getPageById(pageId, lang);
    if (isError(result)) return null;
    // The SDK typing may lag behind what OE actually ships for the `blocks` field — treat it as an unknown-shaped list.
    return result as unknown as {
      blocks?: unknown;
    };
  },
  ['oe-page-by-id'],
  { revalidate: REVALIDATE_BLOCK, tags: ['oe-page'] },
);

/** Resolve a single block by marker, including the product list for product-list-typed blocks. */
export const loadBlockWithProducts = withTiming('loadBlockWithProducts', _loadBlockWithProducts);

async function _loadBlockWithProducts(
  marker: string,
  options: { categoryPath?: string; lang?: string } = {},
): Promise<PageBlock | null> {
  if (!isOneEntryEnabled) return null;
  const lang = options.lang ?? DEFAULT_LOCALE;

  const block = await getCachedBlock(marker, lang, 12);
  if (!block) return null;

  const title = blockTitle(block.localizeInfos, lang);
  const type = block.type ?? '';
  const position = Number(block.position ?? 0);
  const limit = Number(block.quantity ?? 12) || 12;

  let products: Product[] = [];
  if (PRODUCT_BLOCK_TYPES.has(type)) {
    // Trending blocks read from a separate endpoint that consumes the OE activity stream (views / add-to-cart / purchases).
    const inlineItems =
      type === 'trending_block'
        ? await getCachedTrending(marker, lang)
        : (block.similarProducts?.items ?? block.products ?? []);
    const ids = inlineItems.map((it) => Number(it?.id)).filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length > 0) {
      const { items } = await loadProducts({ ids, limit: ids.length, lang });
      products = items.map(adaptCatalogProductToUiProduct);
    }
    // For blocks with a bigger admin-configured quantity than the default page size, re-fetch with the actual limit.
    if (products.length === 0 && limit !== 12) {
      const bigger = await getCachedBlock(marker, lang, limit);
      const items = bigger?.similarProducts?.items ?? bigger?.products ?? [];
      const ids2 = items.map((it) => Number(it?.id)).filter((n) => Number.isFinite(n) && n > 0);
      if (ids2.length > 0) {
        const { items: catalogItems } = await loadProducts({ ids: ids2, limit: ids2.length, lang });
        products = catalogItems.map(adaptCatalogProductToUiProduct);
      }
    }
    // Homepage `similar_products_block` markers (`homepage_new_arrivals`, `homepage_best_sellers`, `homepage_sale`) return no items from OE because there's no seed product to compute similarity against.
    if (products.length === 0) {
      products = await loadHomepageBlockFallback(marker, limit, lang);
    }
  }

  // Slider blocks carry their content as a separate tree.
  const slides = type === 'slider_block' ? await getCachedSlides(marker, lang) : undefined;

  return { marker, type, title, position, products, attributeValues: block.attributeValues, slides };
}

/** Marker → product `label` used as the fallback tag when OE's similarity block returns no items. */
const HOMEPAGE_FALLBACK_LABELS: Record<string, string> = {
  homepage_new_arrivals: 'NEW',
  homepage_best_sellers: 'BESTSELLER',
  homepage_sale: 'SALE',
};

async function loadHomepageBlockFallback(marker: string, limit: number, lang: string): Promise<Product[]> {
  const label = HOMEPAGE_FALLBACK_LABELS[marker];
  if (!label) return [];
  // `loadProducts` filters `p.tag` case-insensitively when `tags` is set.
  const opts: LoadProductsOptions = { tags: [label], limit, lang: lang as LoadProductsOptions['lang'] };
  const { items } = await loadProducts(opts);
  return items.map(adaptCatalogProductToUiProduct);
}

/** Fetch a page by id. */
export const loadPageBlocksById = withTiming(
  'loadPageBlocksById',
  cache(async (pageId: number, langArg?: string): Promise<PageBlock[]> => {
    if (!isOneEntryEnabled) return [];
    const lang = langArg ?? (await currentCmsLocale());
    const page = await getCachedPageById(pageId, lang);
    if (!page) return [];
    // OE has historically shipped `page.blocks` as `string[]` (marker names) but the SDK-normalised payload now returns `Array<{ marker: string, position: number, … }>`. Support both.
    const rawBlocks = Array.isArray(page.blocks) ? (page.blocks as unknown[]) : [];
    const markers = rawBlocks
      .map((b): string | null => {
        if (typeof b === 'string') return b.trim() || null;
        if (b && typeof b === 'object') {
          const marker =
            (b as { marker?: unknown; identifier?: unknown }).marker ?? (b as { identifier?: unknown }).identifier;
          return typeof marker === 'string' && marker.trim() ? marker.trim() : null;
        }
        return null;
      })
      .filter((m): m is string => m !== null);
    if (markers.length === 0) return [];
    const blocks = await Promise.all(markers.map((m) => loadBlockWithProducts(m, { lang })));
    return blocks
      .filter((b): b is PageBlock => b !== null)
      .sort((a, b) => a.position - b.position || markers.indexOf(a.marker) - markers.indexOf(b.marker));
  }),
);

export const HOME_PAGE_ID = 1;

/** Fetch the blocks attached to a page identified by `pageUrl`. */
const getCachedBlocksByPageUrl = unstable_cache(
  async (pageUrl: string, lang: string) => {
    const result = await getApi().Pages.getBlocksByPageUrl(pageUrl, lang);
    if (isError(result)) return [];
    // Same array-or-`{items}` tolerance the product paths above already apply.
    const items = Array.isArray(result) ? result : ((result as unknown as { items?: unknown })?.items ?? []);
    return (Array.isArray(items) ? items : []) as Array<{ identifier?: string; position?: number }>;
  },
  ['oe-page-blocks-by-url'],
  { revalidate: REVALIDATE_BLOCK, tags: ['oe-page', 'oe-block'] },
);

export const loadPageBlocksByUrl = withTiming(
  'loadPageBlocksByUrl',
  cache(async (pageUrl: string, langArg?: string): Promise<PageBlock[]> => {
    if (!isOneEntryEnabled) return [];
    if (!pageUrl || typeof pageUrl !== 'string') return [];
    const lang = langArg ?? (await currentCmsLocale());
    const raw = await getCachedBlocksByPageUrl(pageUrl, lang);
    if (raw.length === 0) return [];
    const markers = raw
      .map((b) => (typeof b.identifier === 'string' ? b.identifier.trim() : ''))
      .filter((m): m is string => m.length > 0);
    if (markers.length === 0) return [];
    const blocks = await Promise.all(markers.map((m) => loadBlockWithProducts(m, { lang })));
    return blocks
      .filter((b): b is PageBlock => b !== null)
      .sort((a, b) => a.position - b.position || markers.indexOf(a.marker) - markers.indexOf(b.marker));
  }),
);

/** Fetch the blocks attached to a specific product entity in OE. */
const getCachedProductBlocks = unstable_cache(
  async (productId: number) => {
    const result = await getApi().Products.getProductBlockById(productId);
    if (isError(result)) return [];
    return (result as unknown as Array<{ identifier?: string; position?: number }>).slice();
  },
  ['oe-product-blocks'],
  // Product-scoped, so it follows the PDP window rather than the homepage one — on the homepage
  // window it was the shortest cache the PDP read, and therefore the one setting its expiry.
  { revalidate: REVALIDATE_PRODUCT, tags: ['oe-product', 'oe-block'] },
);

export const loadProductBlocks = withTiming(
  'loadProductBlocks',
  cache(async (productId: number, langArg?: string): Promise<PageBlock[]> => {
    if (!isOneEntryEnabled) return [];
    if (!Number.isFinite(productId) || productId <= 0) return [];
    const lang = langArg ?? (await currentCmsLocale());
    const raw = await getCachedProductBlocks(productId);
    if (raw.length === 0) return [];
    const markers = raw
      .map((b) => (typeof b.identifier === 'string' ? b.identifier.trim() : ''))
      .filter((m): m is string => m.length > 0);
    if (markers.length === 0) return [];
    const blocks = await Promise.all(markers.map((m) => loadBlockWithProducts(m, { lang })));
    return blocks
      .filter((b): b is PageBlock => b !== null)
      .sort((a, b) => a.position - b.position || markers.indexOf(a.marker) - markers.indexOf(b.marker));
  }),
);

/** Resolve a `frequently_ordered_block` for a specific product. */
export const loadFrequentlyOrderedBlock = withTiming('loadFrequentlyOrderedBlock', _loadFrequentlyOrderedBlock);

async function _loadFrequentlyOrderedBlock(
  marker: string,
  productId: number,
  lang: string = DEFAULT_LOCALE,
): Promise<PageBlock | null> {
  if (!isOneEntryEnabled) return null;
  if (!Number.isFinite(productId) || productId <= 0) return null;

  const block = await getCachedBlock(marker, lang, 12);
  const title = blockTitle(block?.localizeInfos, lang);
  const type = block?.type ?? 'frequently_ordered_block';
  const position = Number(block?.position ?? 0);

  // OE's `getFrequentlyOrderedProducts` recomputes cross-purchase stats server-side on every cold miss.
  const data = await Promise.race([
    getFrequentlyOrderedDedup(marker, productId, lang),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
  ]);
  const ids = (data?.items ?? []).map((it) => Number(it?.id)).filter((n) => Number.isFinite(n) && n > 0);

  let products: Product[] = [];
  if (ids.length > 0) {
    const { items } = await loadProducts({ ids, limit: ids.length, lang });
    products = items.map(adaptCatalogProductToUiProduct);
  }
  return { marker, type, title, position, products, attributeValues: block?.attributeValues };
}
