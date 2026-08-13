import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SEO } from '@/app/data/seoData';
import { AccountPage } from '@/app/pages/AccountPage';
import { withCmsSeo } from '@/lib/oneentry/catalog/page-seo';
import { FormPlaceholdersProvider } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { loadFormContent } from '@/lib/oneentry/forms/placeholders';

/** Title/description/keywords/canonical come from the OE `account` page when an editor filled them. */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('account', SEO.account);
}

export default async function Page() {
  const [userAddresses, serviceRequest, userData] = await Promise.all([
    loadFormContent('user_addresses'),
    loadFormContent('service_request'),
    // `user_data` owns the profile extras (birthday, sizes); the remaining profile fields are account properties with no form attribute behind them.
    loadFormContent('user_data'),
  ]);
  return (
    <FormPlaceholdersProvider
      forms={{ user_addresses: userAddresses, service_request: serviceRequest, user_data: userData }}
    >
      {/* `AccountPage` reads `?tab=` through `useSearchParams`, which opts the
          enclosing tree into per-request rendering. Without a boundary of its
          own that opt-in escapes upward and takes the whole route's static
          shell with it (Next's "missing-suspense-with-csr-bailout"); the
          account screen is shopper-scoped and renders nothing meaningful
          server-side anyway, so the fallback is deliberately empty. */}
      <Suspense fallback={null}>
        <AccountPage />
      </Suspense>
    </FormPlaceholdersProvider>
  );
}
