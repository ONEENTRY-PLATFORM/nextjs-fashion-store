import type { Metadata } from 'next';
import { withCmsSeo } from '../../../src/lib/oneentry/catalog/page-seo';
import { SEO } from '../../../src/app/data/seoData';
import { PaymentPage } from '../../../src/app/pages/PaymentPage';
import { loadCheckoutSystemTexts } from '../../../src/lib/oneentry/labels/checkout-labels';
import { CheckoutLabelsProvider } from '../../../src/lib/oneentry/labels/CheckoutLabelsContext';
import { loadPageBlocksByUrl } from '../../../src/lib/oneentry/blocks/page-blocks';

/** Title/description/keywords/canonical come from the OE `payment` page when an
 *  editor filled them; `SEO.checkoutPayment` stays as the offline fallback. */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('payment', SEO.checkoutPayment);
}

export default async function Page() {
  const [labels, pageBlocks] = await Promise.all([
    loadCheckoutSystemTexts(),
    loadPageBlocksByUrl('payment'),
  ]);
  return (
    <CheckoutLabelsProvider data={labels}>
      <PaymentPage pageBlocks={pageBlocks} />
    </CheckoutLabelsProvider>
  );
}
