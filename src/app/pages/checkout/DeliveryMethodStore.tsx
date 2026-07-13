'use client'
import { Store, MapPin, Clock, CheckCircle, ChevronDown } from 'lucide-react';
import { RadioCard } from '../../components/RadioCard';
import { PICKUP_PERKS, type PickupStore } from '../../data/checkoutConfig';
import { DELIVERY_METHOD_STORE_LABELS as L, GUEST_CONTACT_LABELS as GC } from '../../data/checkoutLabels';
import { GuestContactForm, type GuestContactFormState } from './GuestContactForm';
import { useDeliveryMethodInfo } from '../../../lib/oneentry/checkout/DeliveryMethodInfoContext';

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
  checked, onChange,
  stores,
  selectedStore, setSelectedStore,
  storeDropOpen, setStoreDropOpen,
  isLoggedIn, guestContact, setGuestContact, guestContactErrors,
}: DeliveryMethodStoreProps) {
  const info = useDeliveryMethodInfo();
  const title    = info?.store.title    ?? L.title;
  const subtitle = info?.store.subtitle ?? L.subtitle;
  const perks    = info?.store.perks    ?? PICKUP_PERKS.map((p) => p.text);
  return (
    <RadioCard
      id="store"
      checked={checked}
      onChange={onChange}
      icon={<Store size={20} />}
      title={title}
      subtitle={subtitle}
    >
      <div className="pt-4">
        <label className="block text-xs tracking-wide uppercase mb-1.5 font-semibold text-[#555]">
          {L.selectStore}
        </label>
        <div className="relative">
          <button
            onClick={() => setStoreDropOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-left focus-visible:outline-none border border-[#d1d5db] rounded-none"
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
            <div className="absolute top-full left-0 right-0 bg-white z-20 border border-[#d1d5db] border-t-0">
              {stores.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedStore(s); setStoreDropOpen(() => false); }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors focus-visible:outline-none border-b border-[#f0f0f0] ${
                    selectedStore.id === s.id ? 'font-semibold' : 'font-normal'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-[#fafafa] border border-[#e5e7eb]">
          <div className="flex items-start gap-2 mb-2">
            <MapPin size={14} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" />
            <p className="text-xs text-gray-600">{selectedStore.address}</p>
          </div>
          <div className="flex items-start gap-2">
            <Clock size={14} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" />
            <p className="text-xs text-gray-600">{selectedStore.hours}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4">
          {perks.map(text => (
            <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500">
              <CheckCircle size={12} className="text-green-600" />
              {text}
            </div>
          ))}
        </div>

        {/* Guest contact form temporarily disabled — checkout is sign-in-only.
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
