import type { Metadata } from 'next';

import { SEO } from '../../../../src/app/data/seoData';
import { PaymentPage } from '../../../../src/app/pages/PaymentPage';
import { loadPageBlocksByUrl } from '../../../../src/lib/oneentry/blocks/page-blocks';
import { withCmsSeo } from '../../../../src/lib/oneentry/catalog/page-seo';

/**
 * Title/description/keywords/canonical come from the OE `payment` page when an
 *  editor filled them; `SEO.checkoutPayment` stays as the offline fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('payment', SEO.checkoutPayment);
}

export default async function Page() {
  const pageBlocks = await loadPageBlocksByUrl('payment');
  return <PaymentPage pageBlocks={pageBlocks} />;
}
