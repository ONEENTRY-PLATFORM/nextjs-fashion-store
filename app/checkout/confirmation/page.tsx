import type { Metadata } from 'next';
import { withCmsSeo } from '../../../src/lib/oneentry/catalog/page-seo';
import { SEO } from '../../../src/app/data/seoData';
import { ConfirmationPage } from '../../../src/app/pages/ConfirmationPage';
import { loadCheckoutSystemTexts } from '../../../src/lib/oneentry/labels/checkout-labels';
import { CheckoutLabelsProvider } from '../../../src/lib/oneentry/labels/CheckoutLabelsContext';
import { loadCheckoutSuccessMessage } from '../../../src/lib/oneentry/checkout/delivery-methods';

/** Title/description/keywords/canonical come from the OE `confirmation` page when an
 *  editor filled them; `SEO.checkoutConfirmation` stays as the offline fallback. */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('confirmation', SEO.checkoutConfirmation);
}

export default async function Page() {
  const [labels, successMessage] = await Promise.all([
    loadCheckoutSystemTexts(),
    loadCheckoutSuccessMessage(),
  ]);
  return (
    <CheckoutLabelsProvider data={labels}>
      <ConfirmationPage successMessage={successMessage} />
    </CheckoutLabelsProvider>
  );
}
