import type { Metadata } from 'next';

import { SEO } from '@/app/data/seoData';
import { CartPage } from '@/app/pages/CartPage';
import { loadPageBlocksByUrl } from '@/lib/oneentry/blocks/page-blocks';
import { withCmsSeo } from '@/lib/oneentry/catalog/page-seo';

/**
 * Title/description/keywords/canonical come from the OE `cart` page when an
 *  editor filled them; `SEO.cart` stays as the offline fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('cart', SEO.cart);
}

export default async function Page() {
  const pageBlocks = await loadPageBlocksByUrl('cart');
  return <CartPage pageBlocks={pageBlocks} />;
}
