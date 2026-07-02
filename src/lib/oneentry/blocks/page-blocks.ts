import { cache } from 'react';
import { loadProducts } from '../catalog/products';
import { adaptCatalogProductToUiProduct } from '../catalog/adapt';
import type { Product } from '../../../app/components/ProductCard';
import { DEFAULT_LOCALE } from '../locale';
import { REVALIDATE_HOME } from '../../isr';

/** Block descriptor returned by `loadPageBlocks`. Generic enough that the
 *  consumer (HomePage) can switch on `type` + `marker` to pick the right
 *  storefront component. */
export interface PageBlock {
  marker: string;
  type: string;
  title: string;
  /** Position from OE — already used for sorting before return. */
  position: number;
  /** For product-list blocks (`trending_block`, `similar_products_block`,
   *  `product_block`) the resolved products. Empty array otherwise. */
  products: Product[];
}

interface RawSimilarRule {
  attributeMarker?: string;
  conditionMarker?: string;
  conditionValue?: string;
}

interface RawBlock {
  id?: number;
  type?: string;
  position?: number;
  localizeInfos?: { en_US?: { title?: string } };
  customSettings?: {
    productConfig?: { quantity?: string | number };
    similarProductRules?: RawSimilarRule[];
  };
}

interface RawPage {
  id?: number;
  pageUrl?: string;
  blocks?: unknown;
  localizeInfos?: { en_US?: { title?: string } };
}

const PRODUCT_BLOCK_TYPES = new Set([
  'trending_block',
  'similar_products_block',
  'product_block',
]);

function rulesToTags(rules: RawSimilarRule[] | undefined): string[] {
  if (!rules) return [];
  const tags = new Set<string>();
  for (const r of rules) {
    const m = r.attributeMarker ?? '';
    if (m === 'label' || m.startsWith('lable_')) {
      if (r.conditionValue) tags.add(r.conditionValue);
    }
  }
  return [...tags];
}

async function fetchJson<T>(url: string, appToken: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'x-app-token': appToken, accept: 'application/json' },
      // Homepage blocks cache per URL for the ISR window (`REVALIDATE_HOME`).
      // Set `ISR_DISABLED=1` in dev to bypass.
      next: { revalidate: REVALIDATE_HOME },
    });
    const txt = await res.text();
    if (!res.ok || !txt.trim().startsWith('{')) return null;
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

/**
 * Resolve a single block by marker, including the product list for
 * product-list-typed blocks. Used internally by `loadPageBlocks`, exported so
 * callers that need just one block can reuse it.
 */
export async function loadBlockWithProducts(
  marker: string,
  options: { categoryPath?: string; lang?: string } = {},
): Promise<PageBlock | null> {
  const url = process.env.ONEENTRY_URL;
  const appToken = process.env.ONEENTRY_TOKEN;
  if (!url || !appToken) return null;
  const lang = options.lang ?? DEFAULT_LOCALE;

  const block = await fetchJson<RawBlock>(
    `${url}/api/content/blocks/marker/${encodeURIComponent(marker)}?langCode=${lang}`,
    appToken,
  );
  if (!block) return null;

  const title = (block.localizeInfos?.en_US?.title ?? '').trim();
  const type = block.type ?? '';
  const position = Number(block.position ?? 0);
  const limit = Number(block.customSettings?.productConfig?.quantity ?? 12) || 12;

  let products: Product[] = [];
  if (PRODUCT_BLOCK_TYPES.has(type)) {
    // 1) OE-native resolver first (works once admin uses `in` / `exs` on list attrs).
    const native = await fetchJson<{ items?: { id?: number }[] }>(
      `${url}/api/content/blocks/${encodeURIComponent(marker)}/similar-products?langCode=${lang}&offset=0&limit=${limit}`,
      appToken,
    );
    const ids = (native?.items ?? [])
      .map((it) => Number(it.id))
      .filter((n) => Number.isFinite(n));
    if (ids.length > 0) {
      const { items } = await loadProducts({ ids, limit: ids.length });
      products = items.map(adaptCatalogProductToUiProduct);
    }
    // 2) Fallback — read rules from block and apply locally.
    if (products.length === 0) {
      const tags = rulesToTags(block.customSettings?.similarProductRules);
      if (tags.length > 0) {
        const { items } = await loadProducts({
          tags,
          categoryPath: options.categoryPath,
          limit,
        });
        products = items.map(adaptCatalogProductToUiProduct);
      }
    }
  }

  return { marker, type, title, position, products };
}

/**
 * Fetch a page by id (the home page is `id=1` because its `pageUrl` is the
 * empty string and OE's `/pages/url/{url}/blocks` endpoint can't route an
 * empty segment). Returns each attached block with title, type and (for
 * product-list blocks) resolved products, in admin-defined order.
 */
export const loadPageBlocksById = cache(
  async (pageId: number, lang: string = DEFAULT_LOCALE): Promise<PageBlock[]> => {
    const url = process.env.ONEENTRY_URL;
    const appToken = process.env.ONEENTRY_TOKEN;
    if (!url || !appToken) return [];
    const page = await fetchJson<RawPage>(
      `${url}/api/content/pages/${pageId}?langCode=${lang}`,
      appToken,
    );
    if (!page) return [];
    const markers = Array.isArray(page.blocks)
      ? (page.blocks as unknown[]).filter((b): b is string => typeof b === 'string')
      : [];
    if (markers.length === 0) return [];
    const blocks = await Promise.all(
      markers.map((m) => loadBlockWithProducts(m, { lang })),
    );
    return blocks
      .filter((b): b is PageBlock => b !== null)
      .sort((a, b) => a.position - b.position || markers.indexOf(a.marker) - markers.indexOf(b.marker));
  },
);

export const HOME_PAGE_ID = 1;

/**
 * Resolve a `frequently_ordered_block` for a specific product. OE aggregates
 * cross-purchase stats from real orders and returns products commonly bought
 * together with `productId`. No similarProductRules involved — the result is
 * statistics-driven.
 */
export async function loadFrequentlyOrderedBlock(
  marker: string,
  productId: number,
  lang: string = DEFAULT_LOCALE,
): Promise<PageBlock | null> {
  const url = process.env.ONEENTRY_URL;
  const appToken = process.env.ONEENTRY_TOKEN;
  if (!url || !appToken) return null;
  if (!Number.isFinite(productId) || productId <= 0) return null;

  const block = await fetchJson<RawBlock>(
    `${url}/api/content/blocks/marker/${encodeURIComponent(marker)}?langCode=${lang}`,
    appToken,
  );
  const title = (block?.localizeInfos?.en_US?.title ?? '').trim();
  const type = block?.type ?? 'frequently_ordered_block';
  const position = Number(block?.position ?? 0);

  const data = await fetchJson<{ items?: { id?: number }[] }>(
    `${url}/api/content/blocks/${encodeURIComponent(marker)}/products/${productId}/frequently-ordered?langCode=${lang}`,
    appToken,
  );
  const ids = (data?.items ?? [])
    .map((it) => Number(it.id))
    .filter((n) => Number.isFinite(n));

  let products: Product[] = [];
  if (ids.length > 0) {
    const { items } = await loadProducts({ ids, limit: ids.length });
    products = items.map(adaptCatalogProductToUiProduct);
  }
  return { marker, type, title, position, products };
}
