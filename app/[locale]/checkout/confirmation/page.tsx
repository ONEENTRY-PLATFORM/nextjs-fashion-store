import type { Metadata } from 'next';

import { SEO } from '@/app/data/seoData';
import { ConfirmationPage } from '@/app/pages/ConfirmationPage';
import { withCmsSeo } from '@/lib/oneentry/catalog/page-seo';
import { loadCheckoutSuccessMessage } from '@/lib/oneentry/checkout/delivery-methods';

/**
 * Title/description/keywords/canonical come from the OE `confirmation` page when an
 *  editor filled them; `SEO.checkoutConfirmation` stays as the offline fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('confirmation', SEO.checkoutConfirmation);
}

export default async function Page() {
  const successMessage = await loadCheckoutSuccessMessage();
  return <ConfirmationPage successMessage={successMessage} />;
}
