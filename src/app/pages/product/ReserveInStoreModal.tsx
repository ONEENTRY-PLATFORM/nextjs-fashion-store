'use client';
import { Check, Store, X } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

import { SALE_COLOR } from '@/app/constants/colors';
import type { SizeOption } from '@/app/data/productCatalog';
import { RESERVE_MODAL_LABELS } from '@/app/data/productPageLabels';
import { useFormLabel, useFieldPlaceholder } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { submitForm } from '@/lib/oneentry/forms/submit';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

/**
 * Slim store descriptor for the picker — mapped from the OE store pages by
 *  the PDP route so the modal never carries the full `Store` payload.
 */
export interface ReserveStore {
  /** OE `pageUrl` slug — stable across locales, used as the React key. */
  id: string;
  /** Numeric OE page id, submitted with the form when present. */
  oeId?: number;
  name: string;
  address: string;
}

interface Props {
  onClose: () => void;
  preselectedSize: string | null;
  sizeOptions: SizeOption[];
  /**
   * Real stores from OneEntry. Per-store stock is deliberately absent: OE
   *  exposes no branch-level inventory, and the previous hardcoded
   *  "In stock / Low stock" badges promised availability nobody could honour.
   */
  stores: ReserveStore[];
}

export function ReserveInStoreModal({ onClose, preselectedSize, sizeOptions, stores }: Props) {
  const L = useDict('reserve_in_store_', RESERVE_MODAL_LABELS);
  // Field labels come from the OE `reserve_in_store` form's own attribute
  // titles; `RESERVE_MODAL_LABELS` (system-text `reserve_in_store`) stays the
  // offline fallback. Placeholders have no `additionalFields` on this form, so
  // they keep coming from the set.
  const lbFirstName = useFormLabel('reserve_in_store', 'first_name', L.labelFirstName);
  const phFirstName = useFieldPlaceholder('reserve_in_store', 'first_name', L.placeholderFirstName);
  const phLastName = useFieldPlaceholder('reserve_in_store', 'last_name', L.placeholderLastName);
  const phPhone = useFieldPlaceholder('reserve_in_store', 'phone', L.placeholderPhone);
  const phEmail = useFieldPlaceholder('reserve_in_store', 'email', L.placeholderEmail);
  const lbLastName = useFormLabel('reserve_in_store', 'last_name', L.labelLastName);
  const lbPhone = useFormLabel('reserve_in_store', 'phone', L.labelPhone);
  const lbEmail = useFormLabel('reserve_in_store', 'email', L.labelEmail);
  const lbPickup = useFormLabel('reserve_in_store', 'pickup_date', L.labelPickup);
  const lTitle = useT('reserve_in_store_title', L.title);
  const lSelStore = useT('reserve_in_store_select', L.selectStore);
  const lSelSize = useT('reserve_in_store_size', L.selectSize);
  const lDetails = useT('reserve_in_store_details', L.yourDetails);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(preselectedSize);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [refCode] = useState(() => `OE-${crypto.randomUUID().slice(0, 6).toUpperCase()}`);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedStore) e.store = L.errorRequired;
    if (!size) e.size = L.errorRequired;
    if (!firstName.trim()) e.firstName = L.errorRequired;
    if (!lastName.trim()) e.lastName = L.errorRequired;
    if (!phone.trim()) e.phone = L.errorRequired;
    else if (!/^[+\d\s\-()\\.]{7,}$/.test(phone)) e.phone = L.errorInvalidPhone;
    if (!email.trim()) e.email = L.errorRequired;
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = L.errorInvalidEmail;
    if (!pickupDate) e.pickupDate = L.errorRequired;
    if (!agreed) e.agreed = L.errorMustAgree;
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSubmitError('');
    startTransition(async () => {
      const result = await submitForm('reserve_in_store', [
        { marker: 'size', value: size ?? '', type: 'string' },
        { marker: 'first_name', value: firstName.trim(), type: 'string' },
        { marker: 'last_name', value: lastName.trim(), type: 'string' },
        { marker: 'phone', value: phone.trim(), type: 'string' },
        { marker: 'email', value: email.trim(), type: 'string' },
        { marker: 'pickup_date', value: pickupDate, type: 'string' },
        { marker: 'agreed_terms', value: String(agreed), type: 'string' },
        // Prefer the numeric OE page id so the admin sees a resolvable store
        // reference; the slug is the fallback when the id is absent.
        {
          marker: 'reserve_in_store_form_select_store',
          value: String(store?.oeId ?? selectedStore ?? ''),
          type: 'string',
        },
      ]);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      setSubmitted(true);
    });
  };

  const store = stores.find((s) => s.id === selectedStore);

  // Input borders depend on per-field error state, so we generate a helper.
  const inputClass = (hasError: boolean) =>
    `w-full text-sm text-gray-700 placeholder-gray-300 focus-visible:outline-none px-3 py-2.5 border rounded-none ${
      hasError ? 'border-(--sale)' : 'border-[#e5e7eb]'
    }`;

  return (
    <div
      className="fixed inset-0 z-200 flex items-end justify-center sm:items-center"
      style={{ '--sale': SALE_COLOR } as React.CSSProperties}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative mx-0 flex max-h-[95vh] w-full flex-col rounded-none bg-white sm:mx-4 sm:max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Store size={16} />
            <h2 className="text-sm font-bold tracking-[0.18em] uppercase">{lTitle}</h2>
          </div>
          <button onClick={onClose} className="p-1 transition-opacity hover:opacity-50" aria-label={L.closeLabel}>
            <X size={20} />
          </button>
        </div>

        <div className="shrink-0 border-b border-gray-100 bg-gray-50 px-6 py-3">
          <p className="text-xs leading-relaxed text-gray-500">
            {L.blurbPrefix} <span className="font-semibold text-black">{L.blurbHoldDuration}</span>
            {L.blurbSuffix}
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-5 flex size-12 items-center justify-center bg-black">
              <Check size={22} className="text-white" />
            </div>
            <p className="mb-1 text-sm font-bold tracking-[0.15em] uppercase">{L.confirmedHeading}</p>
            <p className="mb-6 text-xs text-gray-400">
              {L.refPrefix} {refCode}
            </p>
            <div className="mb-6 w-full space-y-2.5 border border-gray-100 bg-gray-50 px-5 py-4 text-left">
              {[
                [L.receiptStore, store?.name ?? ''],
                [L.receiptAddress, store?.address ?? ''],
                [L.receiptSize, size ?? ''],
                [L.receiptPickupBy, pickupDate],
                [L.receiptName, `${firstName} ${lastName}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-xs">
                  <span className="shrink-0 text-gray-400">{label}</span>
                  <span className="text-right font-semibold">{value}</span>
                </div>
              ))}
            </div>
            <p className="mb-7 text-xs text-gray-400">
              {L.confirmEmailedPrefix} <span className="font-semibold">{email}</span>
            </p>
            <button
              onClick={onClose}
              className="rounded-none bg-black px-10 py-3 text-xs tracking-[0.2em] text-white uppercase transition-colors hover:bg-gray-800"
            >
              {L.ctaDone}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-7 p-6">
              <div>
                <p className="mb-3 text-xs font-semibold tracking-[0.12em] uppercase">
                  {lSelStore} <span className="text-(--sale)">*</span>
                </p>
                <div className="space-y-2" data-testid="reserve-store-list">
                  {stores.map((s) => {
                    const active = selectedStore === s.id;
                    return (
                      <button
                        key={s.id}
                        data-testid="reserve-store-option"
                        onClick={() => {
                          setSelectedStore(s.id);
                          setErrors((e) => ({ ...e, store: '' }));
                        }}
                        className={`flex w-full cursor-pointer items-start justify-between gap-3 rounded-none border px-4 py-3 text-left transition-colors ${
                          active
                            ? 'border-black bg-black'
                            : errors.store
                              ? 'border-(--sale) bg-white'
                              : 'border-[#e5e7eb] bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-none border-2 ${
                              active ? 'border-white' : 'border-[#d1d5db]'
                            }`}
                          >
                            {active && <div className="size-2 bg-white" />}
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${active ? 'text-white' : 'text-black'}`}>{s.name}</p>
                            <p className={`mt-0.5 text-xs ${active ? 'text-[#c4c4c4]' : 'text-gray-400'}`}>
                              {s.address}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.store && <p className="mt-1.5 text-xs text-(--sale)">{errors.store}</p>}
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold tracking-[0.12em] uppercase">
                  {lSelSize} <span className="text-(--sale)">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((s) => {
                    const active = size === s.label;
                    return (
                      <button
                        key={s.label}
                        disabled={!s.available}
                        onClick={() => {
                          setSize(s.label);
                          setErrors((e) => ({ ...e, size: '' }));
                        }}
                        className={`relative flex h-10 w-12 items-center justify-center overflow-hidden rounded-none border text-xs transition-colors ${
                          s.available ? 'cursor-pointer' : 'cursor-not-allowed'
                        } ${
                          active
                            ? 'border-black bg-black text-white'
                            : errors.size
                              ? `border-(--sale) bg-white ${s.available ? 'text-black' : 'text-gray-300'}`
                              : `border-[#e5e7eb] bg-white ${s.available ? 'text-black' : 'text-gray-300'}`
                        }`}
                      >
                        {s.label}
                        {!s.available && (
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="absolute -inset-x-0.5 top-1/2 h-px rotate-[-20deg] bg-gray-300" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {errors.size && <p className="mt-1.5 text-xs text-(--sale)">{errors.size}</p>}
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold tracking-[0.12em] uppercase">{lDetails}</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      {/* `data-testid` on the label, not the input: the OE form
                          content is what the e2e suite pins (see
                          `tests/e2e/reserve-in-store-cms.spec.ts`), and the
                          label carries the attribute's authored title. */}
                      <label data-testid="reserve-label-first-name" className="mb-1.5 block text-xs text-gray-500">
                        {lbFirstName} <span className="text-(--sale)">*</span>
                      </label>
                      <input
                        data-testid="reserve-input-first-name"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          setErrors((err) => ({ ...err, firstName: '' }));
                        }}
                        placeholder={phFirstName}
                        className={inputClass(!!errors.firstName)}
                      />
                      {errors.firstName && <p className="mt-0.5 text-xs text-(--sale)">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label data-testid="reserve-label-last-name" className="mb-1.5 block text-xs text-gray-500">
                        {lbLastName} <span className="text-(--sale)">*</span>
                      </label>
                      <input
                        data-testid="reserve-input-last-name"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          setErrors((err) => ({ ...err, lastName: '' }));
                        }}
                        placeholder={phLastName}
                        className={inputClass(!!errors.lastName)}
                      />
                      {errors.lastName && <p className="mt-0.5 text-xs text-(--sale)">{errors.lastName}</p>}
                    </div>
                  </div>
                  <div>
                    <label data-testid="reserve-label-phone" className="mb-1.5 block text-xs text-gray-500">
                      {lbPhone} <span className="text-(--sale)">*</span>
                    </label>
                    <input
                      data-testid="reserve-input-phone"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setErrors((err) => ({ ...err, phone: '' }));
                      }}
                      placeholder={phPhone}
                      type="tel"
                      className={inputClass(!!errors.phone)}
                    />
                    {errors.phone && <p className="mt-0.5 text-xs text-(--sale)">{errors.phone}</p>}
                  </div>
                  <div>
                    <label data-testid="reserve-label-email" className="mb-1.5 block text-xs text-gray-500">
                      {lbEmail} <span className="text-(--sale)">*</span>
                    </label>
                    <input
                      data-testid="reserve-input-email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors((err) => ({ ...err, email: '' }));
                      }}
                      placeholder={phEmail}
                      type="email"
                      className={inputClass(!!errors.email)}
                    />
                    {errors.email && <p className="mt-0.5 text-xs text-(--sale)">{errors.email}</p>}
                  </div>
                  <div>
                    <label data-testid="reserve-label-pickup-date" className="mb-1.5 block text-xs text-gray-500">
                      {lbPickup} <span className="text-(--sale)">*</span>
                    </label>
                    <input
                      value={pickupDate}
                      onChange={(e) => {
                        setPickupDate(e.target.value);
                        setErrors((err) => ({ ...err, pickupDate: '' }));
                      }}
                      type="date"
                      min={minDate}
                      className={inputClass(!!errors.pickupDate)}
                    />
                    {errors.pickupDate && <p className="mt-0.5 text-xs text-(--sale)">{errors.pickupDate}</p>}
                  </div>
                </div>
              </div>

              <div>
                <label className="flex cursor-pointer items-start gap-3">
                  <div
                    onClick={() => {
                      setAgreed((a) => !a);
                      setErrors((e) => ({ ...e, agreed: '' }));
                    }}
                    className={`mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-none border transition-colors ${
                      agreed ? 'bg-black' : 'bg-white'
                    } ${errors.agreed ? 'border-(--sale)' : agreed ? 'border-black' : 'border-[#d1d5db]'}`}
                  >
                    {agreed && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-xs leading-relaxed text-gray-600">
                    {L.termsPrefix} <span className="font-semibold">{L.termsHold}</span> {L.termsSuffix}
                  </span>
                </label>
                {errors.agreed && <p className="mt-1.5 ml-7 text-xs text-(--sale)">{errors.agreed}</p>}
              </div>
            </div>
          </div>
        )}

        {!submitted && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-200 px-6 py-4">
            <span className="text-xs text-gray-400">{submitError || L.requiredFieldsNote}</span>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="shrink-0 rounded-none bg-black px-10 py-3 text-xs tracking-[0.2em] text-white uppercase transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {isPending ? '...' : L.ctaReserve}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
