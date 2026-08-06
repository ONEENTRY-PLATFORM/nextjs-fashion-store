'use client'
import { Package, ChevronDown } from 'lucide-react';
import { RadioCard } from '../../components/ui/RadioCard';
import { PARCEL_LOCKERS } from '../../data/checkoutConfig';

import { DELIVERY_METHOD_LOCKER_LABELS as L } from '../../data/checkoutLabels';
import { type GuestContactFormState } from './GuestContactForm';
import { useDeliveryMethodInfo } from '../../../lib/oneentry/checkout/DeliveryMethodInfoContext';

interface DeliveryMethodLockerProps {
  checked: boolean;
  onChange: () => void;
  selectedLocker: string;
  setSelectedLocker: (l: string) => void;
  lockerDropOpen: boolean;
  setLockerDropOpen: (fn: (o: boolean) => boolean) => void;
  /** Locker names from OE; omitted (Storybook / bare tests) falls back to the
   *  local `PARCEL_LOCKERS` list. */
  lockers?: string[];
  isLoggedIn: boolean;
  guestContact: GuestContactFormState;
  setGuestContact: (next: GuestContactFormState) => void;
  guestContactErrors: Record<string, string>;
}

export function DeliveryMethodLocker({
  checked, onChange,
  selectedLocker, setSelectedLocker,
  lockerDropOpen, setLockerDropOpen,
  lockers,
  // Guest-contact props stay in the signature for the disabled form below.
  isLoggedIn: _isLoggedIn,
  guestContact: _guestContact,
  setGuestContact: _setGuestContact,
  guestContactErrors: _guestContactErrors,
}: DeliveryMethodLockerProps) {
  const info = useDeliveryMethodInfo();
  const lockerList = lockers && lockers.length > 0 ? lockers : PARCEL_LOCKERS;
  const title    = info?.locker.title    ?? L.title;
  const subtitle = info?.locker.subtitle ?? L.subtitle;
  const pinHint  = info?.locker.pinHint  ?? L.pinHint;
  return (
    <RadioCard
      id="locker"
      checked={checked}
      onChange={onChange}
      icon={<Package size={20} />}
      title={title}
      subtitle={subtitle}
    >
      <div className="pt-4">
        <label className="block text-xs tracking-wide uppercase mb-1.5 font-semibold text-[#555]">
          {L.selectPoint}
        </label>
        <div className="relative">
          <button
            onClick={() => setLockerDropOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-left focus-visible:outline-none border border-[#d1d5db] rounded-none"
            aria-expanded={lockerDropOpen}
            aria-haspopup="listbox"
          >
            <span className="truncate pr-2">{selectedLocker}</span>
            <ChevronDown
              size={14}
              className={`shrink-0 transition-transform duration-200 ${lockerDropOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
          {lockerDropOpen && (
            <div className="absolute top-full left-0 right-0 bg-white z-20 border border-[#d1d5db] border-t-0">
              {lockerList.map(l => (
                <button
                  key={l}
                  onClick={() => { setSelectedLocker(l); setLockerDropOpen(() => false); }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors focus-visible:outline-none border-b border-[#f0f0f0] ${
                    selectedLocker === l ? 'font-semibold' : 'font-normal'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">{pinHint}</p>

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
