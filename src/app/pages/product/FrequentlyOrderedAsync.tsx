import type { Product } from '@/app/components/product/ProductCard';
import { loadFrequentlyOrderedBlock } from '@/lib/oneentry/blocks/page-blocks';

import { FrequentlyOrderedClient } from './FrequentlyOrderedClient';

/** Async server component that resolves the OE `frequently_ordered_block` for this product. */
export async function FrequentlyOrderedAsync({
  productId,
  marker = 'pdp_you_may_also_like',
  categoryViewAllHref,
  productGender,
}: {
  productId: number;
  marker?: string;
  categoryViewAllHref: string;
  /** Gender of the current PDP product. */
  productGender?: 'W' | 'M' | 'U' | '';
}) {
  const block = await loadFrequentlyOrderedBlock(marker, productId);
  if (!block) return null;

  const genderOk = (p: Product) =>
    !productGender || productGender === 'U' || !p.gender || p.gender === productGender || p.gender === 'U';

  // Dedupe by id — OE can hand back the same product twice on tenants where an item lives in two overlapping categories, and React chokes on duplicate keys downstream.
  const seenIds = new Set<string>();
  const deduped: Product[] = [];
  for (const p of block.products) {
    if (!genderOk(p) || seenIds.has(p.id)) continue;
    seenIds.add(p.id);
    deduped.push(p);
  }

  if (deduped.length === 0) return null;
  return (
    <FrequentlyOrderedClient
      products={deduped}
      title={block.title || undefined}
      categoryViewAllHref={categoryViewAllHref}
    />
  );
}
