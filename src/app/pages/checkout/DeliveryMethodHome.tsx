'use client'
import { MapPin } from 'lucide-react';
import { RadioCard } from '../../components/RadioCard';
import { FormField } from '../../components/FormField';
import { DELIVERY_TIME_SLOTS, DELIVERY_PERKS } from '../../data/checkoutConfig';
import { DELIVERY_METHOD_HOME_LABELS as L } from '../../data/checkoutLabels';
import type { UserAddress } from '../../data/userData';
import { useFormPlaceholder } from '../../../lib/oneentry/forms/FormPlaceholdersContext';

export interface NewAddressForm {
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  postcode: string;
  instructions: string;
}

interface DeliveryMethodHomeProps {
  checked: boolean;
  onChange: () => void;

  isLoggedIn: boolean;
  savedAddresses: UserAddress[];
  selectedAddressId: string;
  setSelectedAddressId: (id: string) => void;

  newAddrForm: NewAddressForm;
  setNewAddrForm: (fn: (prev: NewAddressForm) => NewAddressForm) => void;
  addrErrors: Record<string, string>;
  setAddrErrors: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  newAddrConfirmed: boolean;
  setNewAddrConfirmed: (v: boolean) => void;
  saveNewAddr: boolean;
  setSaveNewAddr: (v: boolean) => void;
  onConfirmNewAddr: () => void;

  deliveryDates: Date[];
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  selectedSlot: string;
  setSelectedSlot: (id: string) => void;
}

export function DeliveryMethodHome({
  checked, onChange,
  isLoggedIn, savedAddresses, selectedAddressId, setSelectedAddressId,
  newAddrForm, setNewAddrForm, addrErrors, setAddrErrors,
  newAddrConfirmed, setNewAddrConfirmed,
  saveNewAddr, setSaveNewAddr, onConfirmNewAddr,
  deliveryDates, selectedDate, setSelectedDate, selectedSlot, setSelectedSlot,
}: DeliveryMethodHomeProps) {
  const updateAddr = (key: keyof NewAddressForm) => (v: string) => {
    setNewAddrForm(f => ({ ...f, [key]: v }));
    setAddrErrors(e => ({ ...e, [key]: '' }));
  };

  const phFullName     = useFormPlaceholder('user_addresses', 'user_addresses_recipient_name',       'placeholder_name',                 L.placeholderFullName);
  const phPhone        = useFormPlaceholder('user_addresses', 'user_addresses_recipient_phone',      'placeholder_phone',                L.placeholderPhone);
  const phAddressLine1 = useFormPlaceholder('user_addresses', 'user_addresses_line_1',               'placeholder_address_line_1',       L.placeholderAddressLine1);
  const phCity         = useFormPlaceholder('user_addresses', 'user_addresses_city',                 'placeholder_city',                 L.placeholderCity);
  const phPostalCode   = useFormPlaceholder('user_addresses', 'user_addresses_post_code',            'placeholder_postal_code',          L.placeholderPostalCode);
  const phInstructions = useFormPlaceholder('user_addresses', 'user_addresses_special_instructions', 'placeholder_special_instructions', L.placeholderInstructions);

  return (
    <RadioCard
      id="home"
      checked={checked}
      onChange={onChange}
      icon={<MapPin size={20} />}
      title={L.title}
      subtitle={L.subtitle}
    >
      {/* Address selector for logged-in users */}
      {isLoggedIn && savedAddresses.length > 0 ? (
        <div className="pt-4 space-y-2">
          {savedAddresses.map(addr => {
            const isSel = selectedAddressId === addr.id;
            return (
              <button
                key={addr.id}
                onClick={() => { setSelectedAddressId(addr.id); setNewAddrConfirmed(false); }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none border-2 ${
                  isSel ? 'border-black bg-[#fafafa]' : 'border-[#e5e7eb] bg-white'
                }`}
              >
                <span className={`flex-shrink-0 w-4 h-4 rounded-full mt-0.5 flex items-center justify-center bg-white border-2 ${
                  isSel ? 'border-black' : 'border-[#c8c8c8]'
                }`}>
                  {isSel && <span className="w-2 h-2 rounded-full bg-black" />}
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide font-bold">{addr.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{addr.full}</p>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => { setSelectedAddressId('new'); setNewAddrConfirmed(false); setAddrErrors(() => ({})); }}
            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none border-2 ${
              selectedAddressId === 'new' ? 'border-black bg-[#fafafa]' : 'border-[#e5e7eb] bg-white'
            }`}
          >
            <span className={`flex-shrink-0 w-4 h-4 rounded-full mt-0.5 flex items-center justify-center bg-white border-2 ${
              selectedAddressId === 'new' ? 'border-black' : 'border-[#c8c8c8]'
            }`}>
              {selectedAddressId === 'new' && <span className="w-2 h-2 rounded-full bg-black" />}
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide font-bold">{L.useDifferentAddress}</p>
              {selectedAddressId !== 'new' && (
                <p className="text-xs text-gray-400 mt-0.5">{L.useDifferentAddressHint}</p>
              )}
            </div>
          </button>

          {selectedAddressId === 'new' && !newAddrConfirmed && (
            <div className="pt-3 px-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={L.labelFullName} placeholder={phFullName} value={newAddrForm.fullName} onChange={updateAddr('fullName')} error={addrErrors.fullName} />
              <FormField label={L.labelPhone} placeholder={phPhone} type="tel" value={newAddrForm.phone} onChange={updateAddr('phone')} error={addrErrors.phone} />
              <div className="sm:col-span-2">
                <FormField label={L.labelAddressLine1} placeholder={phAddressLine1} value={newAddrForm.line1} onChange={updateAddr('line1')} error={addrErrors.line1} />
              </div>
              <FormField label={L.labelCity} placeholder={phCity} value={newAddrForm.city} onChange={updateAddr('city')} error={addrErrors.city} />
              <FormField label={L.labelPostalCode} placeholder={phPostalCode} value={newAddrForm.postcode} onChange={updateAddr('postcode')} error={addrErrors.postcode} />
              <div className="sm:col-span-2">
                <FormField label={L.labelInstructions} placeholder={phInstructions} value={newAddrForm.instructions} onChange={updateAddr('instructions')} />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="save-addr"
                  checked={saveNewAddr}
                  onChange={e => setSaveNewAddr(e.target.checked)}
                  className="cursor-pointer w-[14px] h-[14px] accent-black"
                />
                <label htmlFor="save-addr" className="text-xs text-gray-600 cursor-pointer">{L.saveToProfile}</label>
              </div>
              <div className="sm:col-span-2">
                <button
                  onClick={onConfirmNewAddr}
                  className="px-6 py-2.5 text-white text-xs tracking-[0.15em] uppercase focus-visible:outline-none hover:opacity-90 transition-opacity bg-black font-semibold"
                >
                  {L.confirmAddress}
                </button>
              </div>
            </div>
          )}

          {selectedAddressId === 'new' && newAddrConfirmed && (
            <div className="px-1 pt-1 flex items-center justify-between gap-2">
              <p className="text-xs text-gray-600">
                {newAddrForm.fullName} · {newAddrForm.line1}, {newAddrForm.city} {newAddrForm.postcode}
              </p>
              <button onClick={() => setNewAddrConfirmed(false)} className="text-xs underline text-gray-500 hover:text-black flex-shrink-0">{L.editAddress}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={L.labelFullName} placeholder={phFullName} value={newAddrForm.fullName} onChange={updateAddr('fullName')} error={addrErrors.fullName} />
          <FormField label={L.labelPhone} placeholder={phPhone} type="tel" value={newAddrForm.phone} onChange={updateAddr('phone')} error={addrErrors.phone} />
          <div className="sm:col-span-2">
            <FormField label={L.labelAddressLine1} placeholder={phAddressLine1} value={newAddrForm.line1} onChange={updateAddr('line1')} error={addrErrors.line1} />
          </div>
          <FormField label={L.labelCity} placeholder={phCity} value={newAddrForm.city} onChange={updateAddr('city')} error={addrErrors.city} />
          <FormField label={L.labelPostalCode} placeholder={phPostalCode} value={newAddrForm.postcode} onChange={updateAddr('postcode')} error={addrErrors.postcode} />
          <div className="sm:col-span-2">
            <FormField label={L.labelInstructions} placeholder={phInstructions} value={newAddrForm.instructions} onChange={updateAddr('instructions')} />
          </div>
        </div>
      )}

      {/* Delivery Date */}
      <div className="mt-6">
        <p className="text-xs tracking-wide uppercase mb-3 font-semibold text-[#555]">
          {L.deliveryDate}
        </p>
        <div className="flex gap-2 flex-wrap">
          {deliveryDates.map((date, i) => {
            const isSelected = selectedDate.toDateString() === date.toDateString();
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center px-3 py-2.5 text-xs focus-visible:outline-none transition-colors min-w-[58px] border-2 ${
                  isSelected ? 'border-black bg-black text-white' : 'border-[#e5e7eb] bg-white text-[#374151]'
                }`}
              >
                <span className="font-bold">
                  {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                </span>
                <span className="font-normal mt-0.5">
                  {date.getDate()} {date.toLocaleDateString('en-GB', { month: 'short' })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot */}
      <div className="mt-4">
        <p className="text-xs tracking-wide uppercase mb-3 font-semibold text-[#555]">
          {L.deliveryTime}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          {DELIVERY_TIME_SLOTS.map(slot => {
            const isSelected = selectedSlot === slot.id;
            return (
              <button
                key={slot.id}
                onClick={() => setSelectedSlot(slot.id)}
                className={`flex flex-col items-center justify-center px-4 py-3 text-xs focus-visible:outline-none transition-colors flex-1 border-2 ${
                  isSelected ? 'border-black bg-black text-white' : 'border-[#e5e7eb] bg-white text-[#374151]'
                }`}
              >
                <span className="font-bold">{slot.label}</span>
                <span className="font-normal mt-0.5 opacity-70">{slot.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-5">
        {DELIVERY_PERKS.map(b => (
          <div key={b.text} className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-green-600 font-bold">{b.icon}</span>
            {b.text}
          </div>
        ))}
      </div>
    </RadioCard>
  );
}
