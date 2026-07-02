import type { Metadata } from 'next';
import { SEO, SITE_URL, SCHEMA_DAYS as D, STORE_SCHEMA_NAME as N, ORG_SCHEMA_COPY } from '../../src/app/data/seoData';
import { STORE_SCHEMA_DEFAULTS, type Store } from '../../src/app/data/stores';
import { StoreLocationsPage } from '../../src/app/pages/StoreLocationsPage';
import { JsonLd } from '../../src/app/components/JsonLd';
import { loadStoresSystemTexts } from '../../src/lib/oneentry/labels/stores-labels';
import { StoresLabelsProvider } from '../../src/lib/oneentry/labels/StoresLabelsContext';
import { loadStores } from '../../src/lib/oneentry/catalog/stores';
import { loadStoreLocationsPage } from '../../src/lib/oneentry/catalog/store-locations-page';

import { REVALIDATE_STORES } from '../../src/lib/isr';

export const metadata: Metadata = SEO.stores;

// ISR — stores barely change. Set `ISR_DISABLED=1` in `.env.local` for dev.
export const revalidate = REVALIDATE_STORES;

function buildStoreSchema(store: Store) {
  return {
    '@context': 'https://schema.org',
    '@type': ORG_SCHEMA_COPY.schemaType,
    name: `${N.prefix} ${N.separator} ${store.name}`,
    image: store.image,
    address: {
      '@type': 'PostalAddress',
      streetAddress: store.address,
      addressLocality: store.city,
      postalCode: store.postcode,
      addressCountry: STORE_SCHEMA_DEFAULTS.addressCountry,
    },
    telephone: store.phone,
    email: store.email,
    url: `${SITE_URL}/stores`,
    openingHoursSpecification: store.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: mapDayLabel(h.day),
      opens: h.time.split(' – ')[0] + ':00',
      closes: (h.time.split(' – ')[1] ?? h.time.split(' – ')[0]) + ':00',
    })),
    hasMap: store.mapUrl,
    currenciesAccepted: STORE_SCHEMA_DEFAULTS.currenciesAccepted,
    paymentAccepted: STORE_SCHEMA_DEFAULTS.paymentAccepted,
    priceRange: STORE_SCHEMA_DEFAULTS.priceRange,
  };
}

// Map human-readable day labels to schema.org day names
function mapDayLabel(day: string): string[] {
  const map: Record<string, string[]> = {
    [D.monThruSat]:       [D.monday, D.tuesday, D.wednesday, D.thursday, D.friday, D.saturday],
    [D.monThruSatHyphen]: [D.monday, D.tuesday, D.wednesday, D.thursday, D.friday, D.saturday],
    [D.monday]:           [D.monday],
    [D.tuesday]:          [D.tuesday],
    [D.wednesday]:        [D.wednesday],
    [D.thursday]:         [D.thursday],
    [D.friday]:           [D.friday],
    [D.saturday]:         [D.saturday],
    [D.sunday]:           [D.sunday],
    [D.bankHolidays]:     [],
  };
  return map[day] ?? [];
}

export default async function Page() {
  const [labels, stores, cmsPage] = await Promise.all([
    loadStoresSystemTexts(),
    loadStores(),
    loadStoreLocationsPage(),
  ]);
  const schemas = stores.map(buildStoreSchema);
  return (
    <>
      {schemas.map((schema, i) => (
        <JsonLd key={i} data={schema} />
      ))}
      <StoresLabelsProvider data={labels}>
        <StoreLocationsPage initialStores={stores} cmsPage={cmsPage} />
      </StoresLabelsProvider>
    </>
  );
}
