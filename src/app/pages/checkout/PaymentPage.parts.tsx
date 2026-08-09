'use client';
import { CreditCard, Lock } from 'lucide-react';
import React, { forwardRef, useImperativeHandle, useState } from 'react';

import { PAYMENT_PARTS_LABELS } from '@/app/data/checkoutLabels';
import { useSchemas } from '@/app/utils/useFormMessages';
import { useDict } from '@/lib/oneentry/labels/DictContext';

export type PayMethod = 'cash' | 'card-delivery' | 'qr' | 'apple-pay' | 'google-pay' | 'card-online' | 'installment';

interface OptionCardProps {
  id: string;
  selected: string;
  onSelect: (m: string) => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  children?: React.ReactNode;
}

export function OptionCard({ id, selected, onSelect, icon, title, subtitle, badge, children }: OptionCardProps) {
  const active = selected === id;
  return (
    <div
      className={`mb-3 rounded-none border-2 transition-all duration-200 ${
        active ? 'border-black' : 'border-[#e5e7eb]'
      }`}
    >
      <button
        className="flex w-full items-center gap-4 px-5 py-4 text-left focus-visible:outline-none"
        onClick={() => onSelect(id)}
      >
        <span
          className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-white ${
            active ? 'border-black' : 'border-[#c8c8c8]'
          }`}
        >
          {active && <span className="size-2.5 rounded-full bg-black" />}
        </span>
        <span className={`shrink-0 transition-colors duration-200 ${active ? 'text-black' : 'text-gray-400'}`}>
          {icon}
        </span>
        <div className="flex-1">
          <p className={`text-sm tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-none border border-[#fde68a] bg-[#fffbeb] px-2 py-0.5 text-xs font-semibold text-[#d97706]">
            {badge}
          </span>
        )}
      </button>
      {active && children && <div className="border-t border-[#e5e7eb] px-5 pb-5">{children}</div>}
    </div>
  );
}

export interface CardFormHandle {
  validate: () => boolean;
}

export const CardForm = forwardRef<CardFormHandle>(function CardForm(_, ref) {
  const L = useDict('checkout_payment_parts_', PAYMENT_PARTS_LABELS);
  const schemas = useSchemas();
  const [form, setForm] = useState({ cardNumber: '', nameOnCard: '', expiry: '', cvv: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useImperativeHandle(ref, () => ({
    validate: () => {
      const result = schemas.paymentSchema.safeParse(form);
      if (!result.success) {
        const errs: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string;
          if (!errs[field]) errs[field] = issue.message;
        }
        setErrors(errs);
        return false;
      }
      setErrors({});
      return true;
    },
  }));

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((e2) => {
        const c = { ...e2 };
        delete c[key];
        return c;
      });
    },
  });

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-3 text-sm outline-none rounded-none border ${hasError ? 'border-red-500' : 'border-[#d1d5db]'}`;

  const labelClass = 'block text-xs tracking-wide uppercase mb-1.5 font-semibold text-[#555]';

  return (
    <div className="space-y-4 pt-4">
      <div>
        <label className={labelClass}>{L.cardNumber}</label>
        <div className="relative">
          <input
            type="text"
            placeholder={L.placeholderCardNumber}
            maxLength={19}
            className={`${inputClass(!!errors.cardNumber)} pr-12 tracking-widest`}
            onFocus={(e) => (e.target.style.borderColor = '#000')}
            onBlur={(e) => (e.target.style.borderColor = errors.cardNumber ? '#ef4444' : '#d1d5db')}
            {...field('cardNumber')}
          />
          <CreditCard size={16} className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400" />
        </div>
        {errors.cardNumber && <p className="mt-1 text-xs text-red-500">{errors.cardNumber}</p>}
      </div>
      <div>
        <label className={labelClass}>{L.cardholderName}</label>
        <input
          type="text"
          placeholder={L.placeholderCardholder}
          className={inputClass(!!errors.nameOnCard)}
          onFocus={(e) => (e.target.style.borderColor = '#000')}
          onBlur={(e) => (e.target.style.borderColor = errors.nameOnCard ? '#ef4444' : '#d1d5db')}
          {...field('nameOnCard')}
        />
        {errors.nameOnCard && <p className="mt-1 text-xs text-red-500">{errors.nameOnCard}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{L.expiry}</label>
          <input
            type="text"
            placeholder={L.placeholderExpiry}
            maxLength={5}
            className={inputClass(!!errors.expiry)}
            onFocus={(e) => (e.target.style.borderColor = '#000')}
            onBlur={(e) => (e.target.style.borderColor = errors.expiry ? '#ef4444' : '#d1d5db')}
            {...field('expiry')}
          />
          {errors.expiry && <p className="mt-1 text-xs text-red-500">{errors.expiry}</p>}
        </div>
        <div>
          <label className={labelClass}>{L.cvv}</label>
          <input
            type="password"
            placeholder={L.placeholderCvv}
            maxLength={4}
            className={inputClass(!!errors.cvv)}
            onFocus={(e) => (e.target.style.borderColor = '#000')}
            onBlur={(e) => (e.target.style.borderColor = errors.cvv ? '#ef4444' : '#d1d5db')}
            {...field('cvv')}
          />
          {errors.cvv && <p className="mt-1 text-xs text-red-500">{errors.cvv}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Lock size={11} />
        <span>{L.encryptionNote}</span>
      </div>
    </div>
  );
});

export function QRPanel() {
  const L = useDict('checkout_payment_parts_', PAYMENT_PARTS_LABELS);
  return (
    <div className="flex flex-col items-center gap-4 pt-4">
      <div className="flex size-44 items-center justify-center border-2 border-black bg-[#f9fafb]">
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: 49 }).map((_, i) => {
            const isBlack = [0, 1, 2, 7, 8, 14, 42, 43, 44, 48, 6, 13, 35, 36, 37, 41, 21, 27, 22, 28].includes(i);
            return <div key={i} className={`size-4 ${isBlack ? 'bg-black' : 'bg-white'}`} />;
          })}
        </div>
      </div>
      <p className="max-w-50 text-center text-xs text-gray-500">{L.qrScanHint}</p>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Lock size={11} />
        <span>{L.qrSecureNote}</span>
      </div>
    </div>
  );
}

export function WalletButton({ label, bg, logo }: { label: string; bg: string; logo: React.ReactNode }) {
  return (
    <button
      className="flex w-full items-center justify-center gap-3 rounded-none py-3.5 text-sm text-white transition-opacity hover:opacity-90 focus-visible:outline-none"
      style={{ backgroundColor: bg }}
    >
      {logo}
      <span className="font-semibold">{label}</span>
    </button>
  );
}

export function InstallmentPanel({ cardRef }: { cardRef: React.Ref<CardFormHandle> }) {
  const L = useDict('checkout_payment_parts_', PAYMENT_PARTS_LABELS);
  const [months, setMonths] = useState('3');
  return (
    <div className="space-y-4 pt-4">
      <div>
        <label className="mb-2 block text-xs font-semibold tracking-wide text-[#555] uppercase">
          {L.installmentsCount}
        </label>
        <div className="flex gap-2">
          {['3', '6', '12'].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`flex-1 rounded-none border-2 py-3 text-sm transition-colors focus-visible:outline-none ${
                months === m
                  ? 'border-black bg-black font-bold text-white'
                  : 'border-[#e5e7eb] bg-white font-normal text-black'
              }`}
            >
              {m} {L.installmentsMonthShort}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1 border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-xs">
        <p className="text-gray-500">{L.installmentsTrust}</p>
        <p className="font-semibold">
          {L.installmentsMonthlyPrefix}
          {(368.99 / parseInt(months)).toFixed(2)} {L.installmentsMonthlySuffix} {months} {L.installmentsMonthsSuffix}
        </p>
      </div>
      <CardForm ref={cardRef} />
    </div>
  );
}
