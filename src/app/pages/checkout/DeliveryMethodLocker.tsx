'use client';
import { ChevronDown, Package } from 'lucide-react';

import { RadioCard } from '@/app/components/ui/RadioCard';
import { PARCEL_LOCKERS, type ParcelLocker } from '@/app/data/checkoutConfig';
import {
  DELIVERY_METHOD_LOCKER_LABELS as L_FALLBACK,
  DELIVERY_METHOD_SHARED_LABELS as SH,
} from '@/app/data/checkoutLabels';
import { useDeliveryMethodInfo } from '@/lib/oneentry/checkout/DeliveryMethodInfoContext';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { type GuestContactFormState } from './GuestContactForm';

interface DeliveryMethodLockerProps {
  checked: boolean;
  onChange: () => void;
  selectedLocker: ParcelLocker;
  setSelectedLocker: (l: ParcelLocker) => void;
  lockerDropOpen: boolean;
  setLockerDropOpen: (fn: (o: boolean) => boolean) => void;
  /**
   * Lockers from OE, each with the page id the order references; omitted
   *  (Storybook / bare tests) falls back to the local `PARCEL_LOCKERS` list.
   */
  lockers?: ParcelLocker[];
  isLoggedIn: boolean;
  guestContact: GuestContactFormState;
  setGuestContact: (next: GuestContactFormState) => void;
  guestContactErrors: Record<string, string>;
}

export function DeliveryMethodLocker({
  checked,
  onChange,
  selectedLocker,
  setSelectedLocker,
  lockerDropOpen,
  setLockerDropOpen,
  lockers,
  // Guest-contact props stay in the signature for the disabled form below.
  isLoggedIn: _isLoggedIn,
  guestContact: _guestContact,
  setGuestContact: _setGuestContact,
  guestContactErrors: _guestContactErrors,
}: DeliveryMethodLockerProps) {
  const L = useDict('checkout_delivery_locker_', L_FALLBACK);
  const info = useDeliveryMethodInfo();
  const lockerList = lockers && lockers.length > 0 ? lockers : PARCEL_LOCKERS;
  const title = info?.locker.title ?? L.title;
  const subtitle = info?.locker.subtitle ?? L.subtitle;
  const pinHint = info?.locker.pinHint ?? L.pinHint;
  const lFreeBadge = useT('checkout_delivery_free_badge', SH.freeBadge);
  return (
    <RadioCard
      id="locker"
      testId="delivery-method-locker"
      checked={checked}
      onChange={onChange}
      icon={<Package size={20} />}
      title={title}
      subtitle={subtitle}
      badge={lFreeBadge}
    >
      <div className="pt-4">
        <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[#555] uppercase">
          {L.selectPoint}
        </label>
        <div className="relative">
          <button
            onClick={() => setLockerDropOpen((o) => !o)}
            data-testid="locker-picker-toggle"
            className="flex w-full items-center justify-between rounded-none border border-[#d1d5db] px-4 py-3 text-left text-sm focus-visible:outline-none"
            aria-expanded={lockerDropOpen}
            aria-haspopup="listbox"
          >
            <span className="truncate pr-2">{selectedLocker.name}</span>
            <ChevronDown
              size={14}
              className={`shrink-0 transition-transform duration-200 ${lockerDropOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
          {lockerDropOpen && (
            <div className="absolute inset-x-0 top-full z-20 border border-t-0 border-[#d1d5db] bg-white">
              {lockerList.map((l) => (
                <button
                  key={l.oeId ?? l.name}
                  data-testid="locker-option"
                  // The OE page id the order's `entity` field will carry. The
                  // name beside it is CMS copy and changes per locale.
                  data-locker-id={l.oeId ?? ''}
                  onClick={() => {
                    setSelectedLocker(l);
                    setLockerDropOpen(() => false);
                  }}
                  className={`w-full border-b border-[#f0f0f0] px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 focus-visible:outline-none ${
                    selectedLocker.name === l.name ? 'font-semibold' : 'font-normal'
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">{pinHint}</p>

        {/* Guest contact form temporarily disabled — checkout is sign-in-only.
        To restore: re-import `GuestContactForm` and `GUEST_CONTACT_LABELS as GC`,
        and drop the `_` prefix from the guest-contact props above.
        {!isLoggedIn && (
          <GuestContactForm
            form={guestContact}
            errors={guestContactErrors}
            onChange={setGuestContact}
            helperText={GC.lockerHint}
          />
        )}
        */}
      </div>
    </RadioCard>
  );
}
