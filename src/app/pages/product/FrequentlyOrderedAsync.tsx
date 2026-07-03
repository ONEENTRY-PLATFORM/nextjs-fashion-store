import { loadFrequentlyOrderedBlock } from '../../../lib/oneentry/blocks/page-blocks';
import { loadProducts } from '../../../lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct } from '../../../lib/oneentry/catalog/adapt';
import { FrequentlyOrderedClient } from './FrequentlyOrderedClient';
import type { Product } from '../../components/ProductCard';

const CAROUSEL_TARGET = 8;

/**
 * Async server component that resolves the OE `frequently_ordered_block` for
 * this product. Streamed in via `<Suspense>` so the user sees the main PDP
 * body immediately while OE aggregates "bought-together" stats.
 *
 * The block is statistics-driven — it needs real orders to have items.
 * When OE returns fewer than `CAROUSEL_TARGET` products (typical on a
 * demo / freshly-seeded tenant), backfill from the current product's
 * category so the carousel always has enough tiles to feel populated.
 */
export async function FrequentlyOrderedAsync({
  productId,
  marker = 'pdp_you_may_also_like',
  categoryViewAllHref,
  productGender,
  categoryPath,
}: {
  productId: number;
  marker?: string;
  categoryViewAllHref: string;
  /** Gender of the current PDP product. When set, the carousel only shows
   *  products of the same gender (or unisex) — keeps women/men feeds
   *  consistent even when OE block returns mixed results. */
  productGender?: 'W' | 'M' | 'U' | '';
  /** Category path of the current product (e.g. `/women/women_clothing`).
   *  Used to backfill the carousel from the same shelf when the stats-driven
   *  block returns few items. */
  categoryPath?: string;
}) {
  const block = await loadFrequentlyOrderedBlock(marker, productId);
  const genderOk = (p: Product) =>
    !productGender || productGender === 'U' || !p.gender || p.gender === productGender || p.gender === 'U';

  const primary = block ? block.products.filter(genderOk) : [];

  let products = primary;
  if (products.length < CAROUSEL_TARGET && categoryPath) {
    // Backfill: pull an aggregated slice from the same category, drop the
    // current product and anything already surfaced by the OE block, then
    // top up to the target count. If the leaf category doesn't have enough
    // stock (e.g. an outerwear PDP with only 7 outerwear styles), widen to
    // the parent shelf (`/women/women_clothing`) so the carousel still fills.
    const segments = categoryPath.split('/').filter(Boolean);
    const paths: string[] = [];
    for (let i = segments.length; i >= 2; i--) {
      paths.push('/' + segments.slice(0, i).join('/'));
    }
    const seen = new Set<string>([String(productId), ...primary.map((p) => p.id)]);
    const extras: Product[] = [];
    for (const path of paths) {
      if (products.length + extras.length >= CAROUSEL_TARGET) break;
      const slice = await loadProducts({ categoryPath: path, limit: CAROUSEL_TARGET * 2, unique: true });
      for (const raw of slice.items) {
        const ui = adaptCatalogProductToUiProduct(raw);
        if (seen.has(ui.id) || !genderOk(ui)) continue;
        seen.add(ui.id);
        extras.push(ui);
        if (products.length + extras.length >= CAROUSEL_TARGET) break;
      }
    }
    products = [...products, ...extras];
  }

  // Final dedupe by id. Both the OE block and the backfill loader can hand
  // us the same product twice on some tenants (e.g. an item that belongs to
  // two overlapping categories) — React chokes on duplicate keys downstream.
  const seenIds = new Set<string>();
  const deduped: Product[] = [];
  for (const p of products) {
    if (seenIds.has(p.id)) continue;
    seenIds.add(p.id);
    deduped.push(p);
  }

  if (deduped.length === 0) return null;
  return (
    <FrequentlyOrderedClient
      products={deduped}
      title={(block?.title) || undefined}
      categoryViewAllHref={categoryViewAllHref}
    />
  );
}
