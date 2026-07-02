'use client'
import { useState, useEffect, useTransition } from 'react';
import { X, Store, Check } from 'lucide-react';
import { SALE_COLOR } from '../../constants/colors';
import type { SizeOption } from '../../data/productCatalog';
import { RESERVE_MODAL_LABELS as L } from '../../data/productPageLabels';
import { usePdpT } from '../../../lib/oneentry/labels/PdpLabelsContext';
import { submitForm } from '../../../lib/oneentry/forms/submit';

const STORES = L.stores;

const STOCK_BADGE: Record<'in' | 'low' | 'out', { label: string; color: string }> = {
  in: { label: L.stockBadge.in, color: '#16a34a' },
  low: { label: L.stockBadge.low, color: '#d97706' },
  out: { label: L.stockBadge.out, color: '#9ca3af' },
};

interface Props {
  onClose: () => void;
  preselectedSize: string | null;
  sizeOptions: SizeOption[];
}

export function ReserveInStoreModal({ onClose, preselectedSize, sizeOptions }: Props) {
  const lTitle    = usePdpT('reserve_in_store', 'reserve_in_store_title',   L.title);
  const lSelStore = usePdpT('reserve_in_store', 'reserve_in_store_select',  L.selectStore);
  const lSelSize  = usePdpT('reserve_in_store', 'reserve_in_store_size',    L.selectSize);
  const lDetails  = usePdpT('reserve_in_store', 'reserve_in_store_details', L.yourDetails);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
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
    return () => { document.body.style.overflow = ''; };
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
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitError('');
    startTransition(async () => {
      const result = await submitForm('reserve_in_store', [
        { marker: 'size',                                  value: size ?? '',              type: 'string' },
        { marker: 'first_name',                            value: firstName.trim(),        type: 'string' },
        { marker: 'last_name',                             value: lastName.trim(),         type: 'string' },
        { marker: 'phone',                                 value: phone.trim(),            type: 'string' },
        { marker: 'email',                                 value: email.trim(),            type: 'string' },
        { marker: 'pickup_date',                           value: pickupDate,              type: 'string' },
        { marker: 'agreed_terms',                          value: String(agreed),          type: 'string' },
        { marker: 'reserve_in_store_form_select_store',    value: String(selectedStore),   type: 'string' },
      ]);
      if (!result.ok) { setSubmitError(result.error); return; }
      setSubmitted(true);
    });
  };

  const store = STORES.find(s => s.id === selectedStore);

  // Input borders depend on per-field error state, so we generate a helper.
  const inputClass = (hasError: boolean) =>
    `w-full text-sm text-gray-700 placeholder-gray-300 focus-visible:outline-none px-3 py-2.5 border rounded-none ${
      hasError ? 'border-[var(--sale)]' : 'border-[#e5e7eb]'
    }`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ '--sale': SALE_COLOR } as React.CSSProperties}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-white w-full sm:max-w-xl mx-0 sm:mx-4 max-h-[95vh] flex flex-col rounded-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Store size={16} />
            <h2 className="tracking-[0.18em] uppercase text-sm font-bold">{lTitle}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-50 transition-opacity" aria-label={L.closeLabel}><X size={20} /></button>
        </div>

        <div className="px-6 py-3 flex-shrink-0 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            {L.blurbPrefix}{' '}
            <span className="font-semibold text-black">{L.blurbHoldDuration}</span>{L.blurbSuffix}
          </p>
        </div>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="w-12 h-12 bg-black flex items-center justify-center mb-5">
              <Check size={22} className="text-white" />
            </div>
            <p className="tracking-[0.15em] uppercase text-sm mb-1 font-bold">{L.confirmedHeading}</p>
            <p className="text-xs text-gray-400 mb-6">{L.refPrefix} {refCode}</p>
            <div className="w-full border border-gray-100 bg-gray-50 px-5 py-4 text-left space-y-2.5 mb-6">
              {[
                [L.receiptStore, store?.name ?? ''],
                [L.receiptAddress, store?.address ?? ''],
                [L.receiptSize, size ?? ''],
                [L.receiptPickupBy, pickupDate],
                [L.receiptName, `${firstName} ${lastName}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs gap-4">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="font-semibold text-right">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-7">
              {L.confirmEmailedPrefix} <span className="font-semibold">{email}</span>
            </p>
            <button
              onClick={onClose}
              className="px-10 py-3 text-xs tracking-[0.2em] uppercase text-white bg-black hover:bg-gray-800 transition-colors rounded-none"
            >
              {L.ctaDone}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 space-y-7">
              <div>
                <p className="text-xs tracking-[0.12em] uppercase mb-3 font-semibold">
                  {lSelStore} <span className="text-[var(--sale)]">*</span>
                </p>
                <div className="space-y-2">
                  {STORES.map(s => {
                    const badge = STOCK_BADGE[s.stock];
                    const active = selectedStore === s.id;
                    const disabled = s.stock === 'out';
                    return (
                      <button
                        key={s.id}
                        disabled={disabled}
                        onClick={() => { if (!disabled) { setSelectedStore(s.id); setErrors(e => ({ ...e, store: '' })); } }}
                        className={`w-full text-left px-4 py-3 border transition-colors flex items-start justify-between gap-3 rounded-none ${
                          disabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer'
                        } ${
                          active
                            ? 'border-black bg-black'
                            : errors.store
                              ? 'border-[var(--sale)] bg-white'
                              : disabled
                                ? 'border-[#e5e7eb] bg-[#fafafa]'
                                : 'border-[#e5e7eb] bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 w-4 h-4 border-2 flex-shrink-0 flex items-center justify-center rounded-none ${
                              active ? 'border-white' : 'border-[#d1d5db]'
                            }`}
                          >
                            {active && <div className="w-2 h-2 bg-white" />}
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${active ? 'text-white' : 'text-black'}`}>{s.name}</p>
                            <p className={`text-xs mt-0.5 ${active ? 'text-[#c4c4c4]' : 'text-gray-400'}`}>{s.address}</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p
                            className="text-xs font-semibold"
                            style={{ color: active ? '#fff' : badge.color }}
                          >
                            {badge.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.store && <p className="text-xs mt-1.5 text-[var(--sale)]">{errors.store}</p>}
              </div>

              <div>
                <p className="text-xs tracking-[0.12em] uppercase mb-3 font-semibold">
                  {lSelSize} <span className="text-[var(--sale)]">*</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {sizeOptions.map(s => {
                    const active = size === s.label;
                    return (
                      <button
                        key={s.label}
                        disabled={!s.available}
                        onClick={() => { setSize(s.label); setErrors(e => ({ ...e, size: '' })); }}
                        className={`relative w-12 h-10 text-xs border transition-colors flex items-center justify-center overflow-hidden rounded-none ${
                          s.available ? 'cursor-pointer' : 'cursor-not-allowed'
                        } ${
                          active
                            ? 'border-black bg-black text-white'
                            : errors.size
                              ? `border-[var(--sale)] bg-white ${s.available ? 'text-black' : 'text-gray-300'}`
                              : `border-[#e5e7eb] bg-white ${s.available ? 'text-black' : 'text-gray-300'}`
                        }`}
                      >
                        {s.label}
                        {!s.available && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="absolute top-1/2 -left-0.5 -right-0.5 h-px bg-gray-300 -rotate-[20deg]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {errors.size && <p className="text-xs mt-1.5 text-[var(--sale)]">{errors.size}</p>}
              </div>

              <div>
                <p className="text-xs tracking-[0.12em] uppercase mb-3 font-semibold">{lDetails}</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">{L.labelFirstName} <span className="text-[var(--sale)]">*</span></label>
                      <input
                        value={firstName}
                        onChange={e => { setFirstName(e.target.value); setErrors(err => ({ ...err, firstName: '' })); }}
                        placeholder={L.placeholderFirstName}
                        className={inputClass(!!errors.firstName)}
                      />
                      {errors.firstName && <p className="text-xs mt-0.5 text-[var(--sale)]">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">{L.labelLastName} <span className="text-[var(--sale)]">*</span></label>
                      <input
                        value={lastName}
                        onChange={e => { setLastName(e.target.value); setErrors(err => ({ ...err, lastName: '' })); }}
                        placeholder={L.placeholderLastName}
                        className={inputClass(!!errors.lastName)}
                      />
                      {errors.lastName && <p className="text-xs mt-0.5 text-[var(--sale)]">{errors.lastName}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">{L.labelPhone} <span className="text-[var(--sale)]">*</span></label>
                    <input
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setErrors(err => ({ ...err, phone: '' })); }}
                      placeholder={L.placeholderPhone}
                      type="tel"
                      className={inputClass(!!errors.phone)}
                    />
                    {errors.phone && <p className="text-xs mt-0.5 text-[var(--sale)]">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">{L.labelEmail} <span className="text-[var(--sale)]">*</span></label>
                    <input
                      value={email}
                      onChange={e => { setEmail(e.target.value); setErrors(err => ({ ...err, email: '' })); }}
                      placeholder={L.placeholderEmail}
                      type="email"
                      className={inputClass(!!errors.email)}
                    />
                    {errors.email && <p className="text-xs mt-0.5 text-[var(--sale)]">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">{L.labelPickup} <span className="text-[var(--sale)]">*</span></label>
                    <input
                      value={pickupDate}
                      onChange={e => { setPickupDate(e.target.value); setErrors(err => ({ ...err, pickupDate: '' })); }}
                      type="date"
                      min={minDate}
                      className={inputClass(!!errors.pickupDate)}
                    />
                    {errors.pickupDate && <p className="text-xs mt-0.5 text-[var(--sale)]">{errors.pickupDate}</p>}
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <div
                    onClick={() => { setAgreed(a => !a); setErrors(e => ({ ...e, agreed: '' })); }}
                    className={`flex-shrink-0 w-4 h-4 border mt-0.5 flex items-center justify-center transition-colors rounded-none cursor-pointer ${
                      agreed ? 'bg-black' : 'bg-white'
                    } ${
                      errors.agreed ? 'border-[var(--sale)]' : agreed ? 'border-black' : 'border-[#d1d5db]'
                    }`}
                  >
                    {agreed && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-xs text-gray-600 leading-relaxed">
                    {L.termsPrefix}{' '}
                    <span className="font-semibold">{L.termsHold}</span> {L.termsSuffix}
                  </span>
                </label>
                {errors.agreed && <p className="text-xs mt-1.5 ml-7 text-[var(--sale)]">{errors.agreed}</p>}
              </div>
            </div>
          </div>
        )}

        {!submitted && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-4">
            <span className="text-xs text-gray-400">{submitError || L.requiredFieldsNote}</span>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="px-10 py-3 text-xs tracking-[0.2em] uppercase text-white bg-black hover:bg-gray-800 transition-colors flex-shrink-0 rounded-none disabled:opacity-50"
            >
              {isPending ? '...' : L.ctaReserve}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
