'use client';
import { MapPin } from 'lucide-react';

import { FormField } from '@/app/components/ui/FormField';
import { RadioCard } from '@/app/components/ui/RadioCard';
import { DELIVERY_PERKS, DELIVERY_TIME_SLOTS } from '@/app/data/checkoutConfig';
import type { UserAddress } from '@/app/data/userData';
import { DELIVERY_METHOD_HOME_LABELS as L_FALLBACK , DELIVERY_METHOD_SHARED_LABELS as SH } from '@/app/pages/checkout/copy';
import type { DeliveryTimeSlot } from '@/lib/oneentry/checkout/delivery-schedule';
import { useDeliveryMethodInfo } from '@/lib/oneentry/checkout/DeliveryMethodInfoContext';
import { SAVED_ADDRESS_FORM } from '@/lib/oneentry/checkout/forms';
import { useRoleField } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

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
  /**
   * OE-driven time slots; falls back to the hardcoded set when the parent
   *  didn't supply anything (Storybook / bare render).
   */
  timeSlots?: DeliveryTimeSlot[];
}

export function DeliveryMethodHome({
  checked,
  onChange,
  isLoggedIn,
  savedAddresses,
  selectedAddressId,
  setSelectedAddressId,
  newAddrForm,
  setNewAddrForm,
  addrErrors,
  setAddrErrors,
  newAddrConfirmed,
  setNewAddrConfirmed,
  saveNewAddr,
  setSaveNewAddr,
  onConfirmNewAddr,
  deliveryDates,
  selectedDate,
  setSelectedDate,
  selectedSlot,
  setSelectedSlot,
  timeSlots,
}: DeliveryMethodHomeProps) {
  const L = useDict('checkout_delivery_', L_FALLBACK);
  const slots = timeSlots && timeSlots.length > 0 ? timeSlots : DELIVERY_TIME_SLOTS;
  const updateAddr = (key: keyof NewAddressForm) => (v: string) => {
    setNewAddrForm((f) => ({ ...f, [key]: v }));
    setAddrErrors((e) => ({ ...e, [key]: '' }));
  };

  const info = useDeliveryMethodInfo();
  const title = info?.home.title ?? L.title;
  const subtitle = info?.home.subtitle ?? L.subtitle;
  const perks = info?.home.perks ?? DELIVERY_PERKS.map((p) => p.text);

  // Each input asks the form for the field playing its role, so the copy — and
  // the CMS attribute behind it — can be renamed without touching this file.
  const phFullName = useRoleField(SAVED_ADDRESS_FORM, 'fullName', { placeholder: L.placeholderFullName }).placeholder;
  const phPhone = useRoleField(SAVED_ADDRESS_FORM, 'phone', { placeholder: L.placeholderPhone }).placeholder;
  const phAddressLine1 = useRoleField(SAVED_ADDRESS_FORM, 'line1', {
    placeholder: L.placeholderAddressLine1,
  }).placeholder;
  const phCity = useRoleField(SAVED_ADDRESS_FORM, 'city', { placeholder: L.placeholderCity }).placeholder;
  const phPostalCode = useRoleField(SAVED_ADDRESS_FORM, 'postcode', {
    placeholder: L.placeholderPostalCode,
  }).placeholder;
  const phInstructions = useRoleField(SAVED_ADDRESS_FORM, 'instructions', {
    placeholder: L.placeholderInstructions,
  }).placeholder;

  const lFreeBadge = useT('checkout_delivery_free_badge', SH.freeBadge);
  return (
    <RadioCard
      id="home"
      testId="delivery-method-home"
      checked={checked}
      onChange={onChange}
      icon={<MapPin size={20} />}
      title={title}
      subtitle={subtitle}
      badge={lFreeBadge}
    >
      {/* Address selector for logged-in users */}
      {isLoggedIn && savedAddresses.length > 0 ? (
        <div className="space-y-2 pt-4">
          {savedAddresses.map((addr) => {
            const isSel = selectedAddressId === addr.id;
            return (
              <button
                key={addr.id}
                onClick={() => {
                  setSelectedAddressId(addr.id);
                  setNewAddrConfirmed(false);
                }}
                className={`flex w-full items-start gap-3 border-2 px-4 py-3 text-left transition-colors focus-visible:outline-none ${
                  isSel ? 'border-black bg-[#fafafa]' : 'border-[#e5e7eb] bg-white'
                }`}
              >
                <span
                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 bg-white ${
                    isSel ? 'border-black' : 'border-[#c8c8c8]'
                  }`}
                >
                  {isSel && <span className="size-2 rounded-full bg-black" />}
                </span>
                <div>
                  <p className="text-xs font-bold tracking-wide uppercase">{addr.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{addr.full}</p>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => {
              setSelectedAddressId('new');
              setNewAddrConfirmed(false);
              setAddrErrors(() => ({}));
            }}
            className={`flex w-full items-start gap-3 border-2 px-4 py-3 text-left transition-colors focus-visible:outline-none ${
              selectedAddressId === 'new' ? 'border-black bg-[#fafafa]' : 'border-[#e5e7eb] bg-white'
            }`}
          >
            <span
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 bg-white ${
                selectedAddressId === 'new' ? 'border-black' : 'border-[#c8c8c8]'
              }`}
            >
              {selectedAddressId === 'new' && <span className="size-2 rounded-full bg-black" />}
            </span>
            <div>
              <p className="text-xs font-bold tracking-wide uppercase">{L.useDifferentAddress}</p>
              {selectedAddressId !== 'new' && (
                <p className="mt-0.5 text-xs text-gray-400">{L.useDifferentAddressHint}</p>
              )}
            </div>
          </button>

          {selectedAddressId === 'new' && !newAddrConfirmed && (
            <div className="grid grid-cols-1 gap-4 px-1 pt-3 sm:grid-cols-2">
              <FormField
                label={L.labelFullName}
                placeholder={phFullName}
                value={newAddrForm.fullName}
                onChange={updateAddr('fullName')}
                error={addrErrors.fullName}
                testId="addr-fullName"
              />
              <FormField
                label={L.labelPhone}
                placeholder={phPhone}
                type="tel"
                value={newAddrForm.phone}
                onChange={updateAddr('phone')}
                error={addrErrors.phone}
                testId="addr-phone"
              />
              <div className="sm:col-span-2">
                <FormField
                  label={L.labelAddressLine1}
                  placeholder={phAddressLine1}
                  value={newAddrForm.line1}
                  onChange={updateAddr('line1')}
                  error={addrErrors.line1}
                  testId="addr-line1"
                />
              </div>
              <FormField
                label={L.labelCity}
                placeholder={phCity}
                value={newAddrForm.city}
                onChange={updateAddr('city')}
                error={addrErrors.city}
                testId="addr-city"
              />
              <FormField
                label={L.labelPostalCode}
                placeholder={phPostalCode}
                value={newAddrForm.postcode}
                onChange={updateAddr('postcode')}
                error={addrErrors.postcode}
                testId="addr-postcode"
              />
              <div className="sm:col-span-2">
                <FormField
                  label={L.labelInstructions}
                  placeholder={phInstructions}
                  value={newAddrForm.instructions}
                  onChange={updateAddr('instructions')}
                  testId="addr-instructions"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  id="save-addr"
                  checked={saveNewAddr}
                  onChange={(e) => setSaveNewAddr(e.target.checked)}
                  className="size-3.5 cursor-pointer accent-black"
                />
                <label htmlFor="save-addr" className="cursor-pointer text-xs text-gray-600">
                  {L.saveToProfile}
                </label>
              </div>
              <div className="sm:col-span-2">
                <button
                  onClick={onConfirmNewAddr}
                  className="bg-black px-6 py-2.5 text-xs font-semibold tracking-[0.15em] text-white uppercase transition-opacity hover:opacity-90 focus-visible:outline-none"
                >
                  {L.confirmAddress}
                </button>
              </div>
            </div>
          )}

          {selectedAddressId === 'new' && newAddrConfirmed && (
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <p className="text-xs text-gray-600">
                {newAddrForm.fullName} · {newAddrForm.line1}, {newAddrForm.city} {newAddrForm.postcode}
              </p>
              <button
                onClick={() => setNewAddrConfirmed(false)}
                className="shrink-0 text-xs text-gray-500 underline hover:text-black"
              >
                {L.editAddress}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
          <FormField
            label={L.labelFullName}
            placeholder={phFullName}
            value={newAddrForm.fullName}
            onChange={updateAddr('fullName')}
            error={addrErrors.fullName}
            testId="addr-fullName"
          />
          <FormField
            label={L.labelPhone}
            placeholder={phPhone}
            type="tel"
            value={newAddrForm.phone}
            onChange={updateAddr('phone')}
            error={addrErrors.phone}
            testId="addr-phone"
          />
          <div className="sm:col-span-2">
            <FormField
              label={L.labelAddressLine1}
              placeholder={phAddressLine1}
              value={newAddrForm.line1}
              onChange={updateAddr('line1')}
              error={addrErrors.line1}
              testId="addr-line1"
            />
          </div>
          <FormField
            label={L.labelCity}
            placeholder={phCity}
            value={newAddrForm.city}
            onChange={updateAddr('city')}
            error={addrErrors.city}
            testId="addr-city"
          />
          <FormField
            label={L.labelPostalCode}
            placeholder={phPostalCode}
            value={newAddrForm.postcode}
            onChange={updateAddr('postcode')}
            error={addrErrors.postcode}
            testId="addr-postcode"
          />
          <div className="sm:col-span-2">
            <FormField
              label={L.labelInstructions}
              placeholder={phInstructions}
              value={newAddrForm.instructions}
              onChange={updateAddr('instructions')}
              testId="addr-instructions"
            />
          </div>
        </div>
      )}

      {/* Delivery Date */}
      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold tracking-wide text-[#555] uppercase">{L.deliveryDate}</p>
        <div className="flex flex-wrap gap-2">
          {deliveryDates.map((date, i) => {
            const isSelected = selectedDate.toDateString() === date.toDateString();
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={`flex min-w-14.5 flex-col items-center border-2 px-3 py-2.5 text-xs transition-colors focus-visible:outline-none ${
                  isSelected ? 'border-black bg-black text-white' : 'border-[#e5e7eb] bg-white text-[#374151]'
                }`}
              >
                <span className="font-bold">{date.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                <span className="mt-0.5 font-normal">
                  {date.getDate()} {date.toLocaleDateString('en-GB', { month: 'short' })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot */}
      <div className="mt-4">
        <p className="mb-3 text-xs font-semibold tracking-wide text-[#555] uppercase">{L.deliveryTime}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {slots.map((slot) => {
            const isSelected = selectedSlot === slot.id;
            return (
              <button
                key={slot.id}
                onClick={() => setSelectedSlot(slot.id)}
                className={`flex flex-1 flex-col items-center justify-center border-2 px-4 py-3 text-xs transition-colors focus-visible:outline-none ${
                  isSelected ? 'border-black bg-black text-white' : 'border-[#e5e7eb] bg-white text-[#374151]'
                }`}
              >
                <span className="font-bold">{slot.label}</span>
                <span className="mt-0.5 font-normal opacity-70">{slot.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-4">
        {perks.map((text) => (
          <div key={text} className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-bold text-green-600">✓</span>
            {text}
          </div>
        ))}
      </div>
    </RadioCard>
  );
}
