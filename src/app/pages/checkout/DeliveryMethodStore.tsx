'use client';
import { CheckCircle, ChevronDown, Clock, MapPin, Store } from 'lucide-react';

import { RadioCard } from '@/app/components/ui/RadioCard';
import { PICKUP_PERKS, type PickupStore } from '@/app/data/checkoutConfig';
import { DELIVERY_METHOD_SHARED_LABELS as SH,DELIVERY_METHOD_STORE_LABELS as L_FALLBACK  } from '@/app/pages/checkout/copy';
import { useDeliveryMethodInfo } from '@/lib/oneentry/checkout/DeliveryMethodInfoContext';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { type GuestContactFormState } from './GuestContactForm';

interface DeliveryMethodStoreProps {
  checked: boolean;
  onChange: () => void;
  stores: PickupStore[];
  selectedStore: PickupStore;
  setSelectedStore: (s: PickupStore) => void;
  storeDropOpen: boolean;
  setStoreDropOpen: (fn: (o: boolean) => boolean) => void;
  isLoggedIn: boolean;
  guestContact: GuestContactFormState;
  setGuestContact: (next: GuestContactFormState) => void;
  guestContactErrors: Record<string, string>;
}

export function DeliveryMethodStore({
  checked,
  onChange,
  stores,
  selectedStore,
  setSelectedStore,
  storeDropOpen,
  setStoreDropOpen,
  // Guest-contact props stay in the signature for the disabled form below.
  isLoggedIn: _isLoggedIn,
  guestContact: _guestContact,
  setGuestContact: _setGuestContact,
  guestContactErrors: _guestContactErrors,
}: DeliveryMethodStoreProps) {
  const L = useDict('checkout_delivery_store_', L_FALLBACK);
  const info = useDeliveryMethodInfo();
  const title = info?.store.title ?? L.title;
  const subtitle = info?.store.subtitle ?? L.subtitle;
  const perks = info?.store.perks ?? PICKUP_PERKS.map((p) => p.text);
  const lFreeBadge = useT('checkout_delivery_free_badge', SH.freeBadge);
  return (
    <RadioCard
      id="store"
      testId="delivery-method-store"
      checked={checked}
      onChange={onChange}
      icon={<Store size={20} />}
      title={title}
      subtitle={subtitle}
      badge={lFreeBadge}
    >
      <div className="pt-4">
        <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[#555] uppercase">
          {L.selectStore}
        </label>
        <div className="relative">
          <button
            onClick={() => setStoreDropOpen((o) => !o)}
            data-testid="store-picker-toggle"
            className="flex w-full items-center justify-between rounded-none border border-[#d1d5db] px-4 py-3 text-left text-sm focus-visible:outline-none"
            aria-expanded={storeDropOpen}
            aria-haspopup="listbox"
          >
            <span>{selectedStore.name}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${storeDropOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
          {storeDropOpen && (
            <div className="absolute inset-x-0 top-full z-20 border border-t-0 border-[#d1d5db] bg-white">
              {stores.map((s) => (
                <button
                  key={s.id}
                  data-testid="store-option"
                  // The OE page id the order's `entity` field will carry. Exposed
                  // so a test can assert the picker offers exactly the stores an
                  // editor ticked on the order form — the ids are the contract,
                  // the names are CMS copy.
                  data-store-id={s.oeId ?? ''}
                  onClick={() => {
                    setSelectedStore(s);
                    setStoreDropOpen(() => false);
                  }}
                  className={`w-full border-b border-[#f0f0f0] px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 focus-visible:outline-none ${
                    selectedStore.id === s.id ? 'font-semibold' : 'font-normal'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 border border-[#e5e7eb] bg-[#fafafa] p-4">
          <div className="mb-2 flex items-start gap-2">
            <MapPin size={14} className="mt-0.5 shrink-0 text-accent" />
            <p className="text-xs text-gray-600">{selectedStore.address}</p>
          </div>
          <div className="flex items-start gap-2">
            <Clock size={14} className="mt-0.5 shrink-0 text-accent" />
            <p className="text-xs text-gray-600">{selectedStore.hours}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          {perks.map((text) => (
            <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500">
              <CheckCircle size={12} className="text-green-600" />
              {text}
            </div>
          ))}
        </div>

        {/* Guest contact form temporarily disabled — checkout is sign-in-only.
        To restore: re-import `GuestContactForm` and `GUEST_CONTACT_LABELS as GC`,
        and drop the `_` prefix from the guest-contact props above.
        {!isLoggedIn && (
          <GuestContactForm
            form={guestContact}
            errors={guestContactErrors}
            onChange={setGuestContact}
            helperText={GC.storePickupHint}
          />
        )}
        */}
      </div>
    </RadioCard>
  );
}
