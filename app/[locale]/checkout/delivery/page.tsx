import type { Metadata } from 'next';

import type { PickupStore } from '@/app/data/checkoutConfig';
import { SEO } from '@/app/data/seoData';
import { DeliveryPage } from '@/app/pages/DeliveryPage';
import { loadPageBlocksByUrl } from '@/lib/oneentry/blocks/page-blocks';
import { withCmsSeo } from '@/lib/oneentry/catalog/page-seo';
import { loadStores } from '@/lib/oneentry/catalog/stores';
import { loadDeliveryMethodInfo, loadParcelLockers } from '@/lib/oneentry/checkout/delivery-methods';
import { buildDeliveryDates, loadDeliverySchedule } from '@/lib/oneentry/checkout/delivery-schedule';
import { DeliveryMethodInfoProvider } from '@/lib/oneentry/checkout/DeliveryMethodInfoContext';
import { FormPlaceholdersProvider } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { loadFormContent } from '@/lib/oneentry/forms/placeholders';

/**
 * Title/description/keywords/canonical come from the OE `delivery_method` page when an
 *  editor filled them; `SEO.checkoutDelivery` stays as the offline fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('delivery_method', SEO.checkoutDelivery);
}

export default async function Page() {
  const [userAddresses, stores, deliveryMethodInfo, parcelLockers, scheduleAuthed, scheduleGuest, pageBlocks] =
    await Promise.all([
      loadFormContent('user_addresses'),
      loadStores(),
      loadDeliveryMethodInfo(),
      loadParcelLockers(),
      loadDeliverySchedule('authed'),
      loadDeliverySchedule('guest'),
      loadPageBlocksByUrl('delivery_method'),
    ]);
  // Serialise dates for hand-off to the client component — `Date` objects
  // survive the RSC boundary in Next.js 15+, but ISO strings are cheaper
  // and preserve the "no timezone drift on hydrate" guarantee. Both
  // variants are precomputed here so the client can flip strips based on
  // auth state without any client-side data fetching.
  const deliveryDatesIsoAuthed = buildDeliveryDates(scheduleAuthed.daysAhead, scheduleAuthed.disabledWeekdays).map(
    (d) => d.toISOString(),
  );
  const deliveryDatesIsoGuest = buildDeliveryDates(scheduleGuest.daysAhead, scheduleGuest.disabledWeekdays).map((d) =>
    d.toISOString(),
  );
  // Adapt the full Store record into the slim shape the pickup picker needs.
  // Only stores that carry an OE numeric id are kept — a mock fallback entry
  // would have no way to reference a real store when the order is placed and
  // OE would reject the entity id. `hours` is flattened to a single string so
  // the picker card can render it without another formatting step.
  const pickupStores: PickupStore[] = stores
    .filter((s) => typeof s.oeId === 'number')
    .map((s) => ({
      id: s.id,
      oeId: s.oeId,
      name: s.name,
      address: [s.address, s.postcode].filter(Boolean).join(', '),
      hours: s.hours.map((h) => `${h.day} ${h.time}`).join(', '),
    }));
  return (
    <FormPlaceholdersProvider forms={{ user_addresses: userAddresses }}>
      <DeliveryMethodInfoProvider data={deliveryMethodInfo}>
        <DeliveryPage
          pickupStores={pickupStores}
          parcelLockers={parcelLockers}
          deliveryDatesIsoAuthed={deliveryDatesIsoAuthed}
          deliveryDatesIsoGuest={deliveryDatesIsoGuest}
          deliverySlotsAuthed={scheduleAuthed.slots}
          deliverySlotsGuest={scheduleGuest.slots}
          pageBlocks={pageBlocks}
        />
      </DeliveryMethodInfoProvider>
    </FormPlaceholdersProvider>
  );
}
