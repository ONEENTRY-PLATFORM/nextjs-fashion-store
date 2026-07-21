import type { Metadata } from 'next';
import { SEO } from '../../../src/app/data/seoData';
import { DeliveryPage } from '../../../src/app/pages/DeliveryPage';
import { loadCheckoutSystemTexts } from '../../../src/lib/oneentry/labels/checkout-labels';
import { CheckoutLabelsProvider } from '../../../src/lib/oneentry/labels/CheckoutLabelsContext';
import { loadFormPlaceholders } from '../../../src/lib/oneentry/forms/placeholders';
import { FormPlaceholdersProvider } from '../../../src/lib/oneentry/forms/FormPlaceholdersContext';
import { loadStores } from '../../../src/lib/oneentry/catalog/stores';
import type { PickupStore } from '../../../src/app/data/checkoutConfig';
import { loadDeliveryMethodInfo } from '../../../src/lib/oneentry/checkout/delivery-methods';
import { DeliveryMethodInfoProvider } from '../../../src/lib/oneentry/checkout/DeliveryMethodInfoContext';
import { loadDeliverySchedule, buildDeliveryDates } from '../../../src/lib/oneentry/checkout/delivery-schedule';
import { loadPageBlocksByUrl } from '../../../src/lib/oneentry/blocks/page-blocks';

export const metadata: Metadata = SEO.checkoutDelivery;

export default async function Page() {
  const [labels, userAddresses, stores, deliveryMethodInfo, scheduleAuthed, scheduleGuest, pageBlocks] = await Promise.all([
    loadCheckoutSystemTexts(),
    loadFormPlaceholders('user_addresses'),
    loadStores(),
    loadDeliveryMethodInfo(),
    loadDeliverySchedule('authed'),
    loadDeliverySchedule('guest'),
    loadPageBlocksByUrl('delivery_method'),
  ]);
  // Serialise dates for hand-off to the client component — `Date` objects
  // survive the RSC boundary in Next.js 15+, but ISO strings are cheaper
  // and preserve the "no timezone drift on hydrate" guarantee. Both
  // variants are precomputed here so the client can flip strips based on
  // auth state without any client-side data fetching.
  const deliveryDatesIsoAuthed = buildDeliveryDates(
    scheduleAuthed.daysAhead,
    scheduleAuthed.disabledWeekdays,
  ).map((d) => d.toISOString());
  const deliveryDatesIsoGuest = buildDeliveryDates(
    scheduleGuest.daysAhead,
    scheduleGuest.disabledWeekdays,
  ).map((d) => d.toISOString());
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
    <CheckoutLabelsProvider data={labels}>
      <FormPlaceholdersProvider forms={{ user_addresses: userAddresses }}>
        <DeliveryMethodInfoProvider data={deliveryMethodInfo}>
          <DeliveryPage
            pickupStores={pickupStores}
            deliveryDatesIsoAuthed={deliveryDatesIsoAuthed}
            deliveryDatesIsoGuest={deliveryDatesIsoGuest}
            deliverySlotsAuthed={scheduleAuthed.slots}
            deliverySlotsGuest={scheduleGuest.slots}
            pageBlocks={pageBlocks}
          />
        </DeliveryMethodInfoProvider>
      </FormPlaceholdersProvider>
    </CheckoutLabelsProvider>
  );
}
