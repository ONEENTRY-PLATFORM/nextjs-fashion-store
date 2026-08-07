import type { Metadata } from 'next';
import { withCmsSeo } from '../../../../src/lib/oneentry/catalog/page-seo';
import { SEO } from '../../../../src/app/data/seoData';
import { ConfirmationPage } from '../../../../src/app/pages/ConfirmationPage';
import { loadCheckoutSuccessMessage } from '../../../../src/lib/oneentry/checkout/delivery-methods';

/** Title/description/keywords/canonical come from the OE `confirmation` page when an
 *  editor filled them; `SEO.checkoutConfirmation` stays as the offline fallback. */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('confirmation', SEO.checkoutConfirmation);
}

export default async function Page() {
  const successMessage = await loadCheckoutSuccessMessage();
  return <ConfirmationPage successMessage={successMessage} />;
}
