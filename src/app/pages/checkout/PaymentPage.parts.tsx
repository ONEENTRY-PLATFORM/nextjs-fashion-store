'use client'
import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import { paymentSchema } from '../../utils/schemas';
import { PAYMENT_PARTS_LABELS as L } from '../../data/checkoutLabels';

export type PayMethod =
  | 'cash'
  | 'card-delivery'
  | 'qr'
  | 'apple-pay'
  | 'google-pay'
  | 'card-online'
  | 'installment';

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
      className={`mb-3 transition-all duration-200 rounded-none border-2 ${
        active ? 'border-black' : 'border-[#e5e7eb]'
      }`}
    >
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-left focus-visible:outline-none"
        onClick={() => onSelect(id)}
      >
        <span
          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-white border-2 ${
            active ? 'border-black' : 'border-[#c8c8c8]'
          }`}
        >
          {active && <span className="w-2.5 h-2.5 rounded-full bg-black" />}
        </span>
        <span className={`flex-shrink-0 transition-colors duration-200 ${active ? 'text-black' : 'text-gray-400'}`}>
          {icon}
        </span>
        <div className="flex-1">
          <p className={`text-sm tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {badge && (
          <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-[#fffbeb] text-[#d97706] border border-[#fde68a] rounded-none font-semibold">
            {badge}
          </span>
        )}
      </button>
      {active && children && (
        <div className="px-5 pb-5 border-t border-[#e5e7eb]">
          {children}
        </div>
      )}
    </div>
  );
}

export interface CardFormHandle {
  validate: () => boolean;
}

export const CardForm = forwardRef<CardFormHandle>(function CardForm(_, ref) {
  const [form, setForm] = useState({ cardNumber: '', nameOnCard: '', expiry: '', cvv: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useImperativeHandle(ref, () => ({
    validate: () => {
      const result = paymentSchema.safeParse(form);
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
      setForm(f => ({ ...f, [key]: e.target.value }));
      setErrors(e2 => { const c = { ...e2 }; delete c[key]; return c; });
    },
  });

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-3 text-sm outline-none rounded-none border ${
      hasError ? 'border-red-500' : 'border-[#d1d5db]'
    }`;

  const labelClass = 'block text-xs tracking-wide uppercase mb-1.5 font-semibold text-[#555]';

  return (
    <div className="pt-4 space-y-4">
      <div>
        <label className={labelClass}>{L.cardNumber}</label>
        <div className="relative">
          <input
            type="text"
            placeholder={L.placeholderCardNumber}
            maxLength={19}
            className={`${inputClass(!!errors.cardNumber)} pr-12 tracking-[0.1em]`}
            onFocus={e => (e.target.style.borderColor = '#000')}
            onBlur={e => (e.target.style.borderColor = errors.cardNumber ? '#ef4444' : '#d1d5db')}
            {...field('cardNumber')}
          />
          <CreditCard size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        {errors.cardNumber && <p className="text-xs text-red-500 mt-1">{errors.cardNumber}</p>}
      </div>
      <div>
        <label className={labelClass}>{L.cardholderName}</label>
        <input
          type="text"
          placeholder={L.placeholderCardholder}
          className={inputClass(!!errors.nameOnCard)}
          onFocus={e => (e.target.style.borderColor = '#000')}
          onBlur={e => (e.target.style.borderColor = errors.nameOnCard ? '#ef4444' : '#d1d5db')}
          {...field('nameOnCard')}
        />
        {errors.nameOnCard && <p className="text-xs text-red-500 mt-1">{errors.nameOnCard}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{L.expiry}</label>
          <input
            type="text"
            placeholder={L.placeholderExpiry}
            maxLength={5}
            className={inputClass(!!errors.expiry)}
            onFocus={e => (e.target.style.borderColor = '#000')}
            onBlur={e => (e.target.style.borderColor = errors.expiry ? '#ef4444' : '#d1d5db')}
            {...field('expiry')}
          />
          {errors.expiry && <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>}
        </div>
        <div>
          <label className={labelClass}>{L.cvv}</label>
          <input
            type="password"
            placeholder={L.placeholderCvv}
            maxLength={4}
            className={inputClass(!!errors.cvv)}
            onFocus={e => (e.target.style.borderColor = '#000')}
            onBlur={e => (e.target.style.borderColor = errors.cvv ? '#ef4444' : '#d1d5db')}
            {...field('cvv')}
          />
          {errors.cvv && <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>}
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
  return (
    <div className="pt-4 flex flex-col items-center gap-4">
      <div className="w-44 h-44 flex items-center justify-center border-2 border-black bg-[#f9fafb]">
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: 49 }).map((_, i) => {
            const isBlack = [0,1,2,7,8,14,42,43,44,48,6,13,35,36,37,41,21,27,22,28].includes(i);
            return (
              <div key={i} className={`w-4 h-4 ${isBlack ? 'bg-black' : 'bg-white'}`} />
            );
          })}
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center max-w-[200px]">
        {L.qrScanHint}
      </p>
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
      className="w-full flex items-center justify-center gap-3 py-3.5 text-white text-sm focus-visible:outline-none transition-opacity hover:opacity-90 rounded-none"
      style={{ backgroundColor: bg }}
    >
      {logo}
      <span className="font-semibold">{label}</span>
    </button>
  );
}

export function InstallmentPanel({ cardRef }: { cardRef: React.Ref<CardFormHandle> }) {
  const [months, setMonths] = useState('3');
  return (
    <div className="pt-4 space-y-4">
      <div>
        <label className="block text-xs tracking-wide uppercase mb-2 font-semibold text-[#555]">
          {L.installmentsCount}
        </label>
        <div className="flex gap-2">
          {['3', '6', '12'].map(m => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`flex-1 py-3 text-sm focus-visible:outline-none transition-colors rounded-none border-2 ${
                months === m
                  ? 'border-black bg-black text-white font-bold'
                  : 'border-[#e5e7eb] bg-white text-black font-normal'
              }`}
            >
              {m} {L.installmentsMonthShort}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 text-xs space-y-1 bg-[#fafafa] border border-[#e5e7eb]">
        <p className="text-gray-500">{L.installmentsTrust}</p>
        <p className="font-semibold">
          {L.installmentsMonthlyPrefix}{(368.99 / parseInt(months)).toFixed(2)} {L.installmentsMonthlySuffix} {months} {L.installmentsMonthsSuffix}
        </p>
      </div>
      <CardForm ref={cardRef} />
    </div>
  );
}
