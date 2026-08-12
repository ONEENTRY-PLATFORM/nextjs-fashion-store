import type { Metadata } from 'next';

import { SEO } from '@/app/data/seoData';
import { PaymentPage } from '@/app/pages/PaymentPage';
import { loadPageBlocksByUrl } from '@/lib/oneentry/blocks/page-blocks';
import { withCmsSeo } from '@/lib/oneentry/catalog/page-seo';
import { CHECKOUT_FORM_MARKERS } from '@/lib/oneentry/checkout/forms';
import type { FormContent } from '@/lib/oneentry/forms/form-content';
import { FormPlaceholdersProvider } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { loadFormContent } from '@/lib/oneentry/forms/placeholders';

/**
 * Title/description/keywords/canonical come from the OE `payment` page when an
 *  editor filled them; `SEO.checkoutPayment` stays as the offline fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('payment', SEO.checkoutPayment);
}

export default async function Page() {
  // The checkout forms travel to this step for their attribute labels: when OE
  // rejects an order it names the offending field by its raw marker, and
  // `explainOrderError` swaps in the label the shopper actually saw. Loading
  // them here keeps that mapping authored in the admin panel instead of frozen
  // in a shipped table that goes stale the moment a marker is renamed.
  const [pageBlocks, ...forms] = await Promise.all([
    loadPageBlocksByUrl('payment'),
    ...CHECKOUT_FORM_MARKERS.map((marker) => loadFormContent(marker)),
  ]);
  // `as const` on the pair keeps `Object.fromEntries` on its typed overload —
  // a plain array falls through to the `any`-returning one.
  const formsByMarker: Record<string, FormContent> = Object.fromEntries(
    CHECKOUT_FORM_MARKERS.map((marker, i) => [marker, forms[i]] as const),
  );
  return (
    <FormPlaceholdersProvider forms={formsByMarker}>
      <PaymentPage pageBlocks={pageBlocks} />
    </FormPlaceholdersProvider>
  );
}
