'use client';
import { Edit2 } from 'lucide-react';
import React from 'react';

import { useT } from '../../../lib/oneentry/labels/DictContext';
import { ACCOUNT_SHARED_LABELS } from '../../data/accountLabels';

export { ACCENT_WOMEN as ACCENT } from '../../constants/colors';
import { SALE_COLOR } from '../../constants/colors';

export { fmt } from '../../utils/formatPrice';

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between border-b-2 border-black pb-2.5">
      <h3 className="text-sm font-bold tracking-[0.15em] uppercase">{title}</h3>
      {action}
    </div>
  );
}

export function EditBtn({ onClick }: { onClick: () => void }) {
  const lEdit = useT('user_account_shared_edit', ACCOUNT_SHARED_LABELS.edit);
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-opacity hover:opacity-70 focus-visible:outline-none"
      data-testid="account-edit-btn"
    >
      <Edit2 size={12} />
      {lEdit}
    </button>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  const lDash = useT('user_account_shared_empty_value_dash', ACCOUNT_SHARED_LABELS.emptyValueDash);
  return (
    <div>
      <p className="mb-0.5 text-xs font-medium tracking-wide text-gray-400 uppercase">{label}</p>
      <p className="text-sm font-medium">{value || lDash}</p>
    </div>
  );
}

export function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div style={{ '--sale': SALE_COLOR } as React.CSSProperties}>
      <label
        className={`mb-1.5 block text-xs font-semibold tracking-wide uppercase ${
          error ? 'text-(--sale)' : 'text-[#555]'
        }`}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-none border px-3 py-2.5 text-sm outline-none ${
          error ? 'border-(--sale)' : 'border-[#d1d5db]'
        }`}
        onFocus={(e) => (e.target.style.borderColor = error ? SALE_COLOR : '#000')}
        onBlur={(e) => (e.target.style.borderColor = error ? SALE_COLOR : '#d1d5db')}
      />
      {error && <p className="mt-1 text-xs text-(--sale)">{error}</p>}
    </div>
  );
}

export function Sk({ w = 'w-full', h = 'h-4', className = '' }: { w?: string; h?: string; className?: string }) {
  return <div className={`animate-pulse bg-gray-200 ${w} ${h} ${className}`} />;
}

export function MyDataSkeleton() {
  return (
    <div className="space-y-10">
      <Sk h="h-40" />
      <div>
        <Sk w="w-48" h="h-5" className="mb-5" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Sk w="w-24" h="h-3" />
              <Sk h="h-5" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Sk w="w-36" h="h-5" className="mb-5" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Sk key={i} h="h-16" />
          ))}
        </div>
      </div>
      <div>
        <Sk w="w-44" h="h-5" className="mb-5" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Sk key={i} h="h-12" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MyOrdersSkeleton() {
  return (
    <div className="space-y-4">
      <Sk w="w-40" h="h-6" className="mb-6" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border border-[#e5e7eb] p-4">
          <Sk w="w-16" h="h-20" className="shrink-0" />
          <div className="flex-1 space-y-2">
            <Sk w="w-32" h="h-4" />
            <Sk w="w-24" h="h-3" />
            <Sk w="w-20" h="h-3" />
          </div>
          <div className="space-y-2 text-right">
            <Sk w="w-20" h="h-6" />
            <Sk w="w-16" h="h-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BonusesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Sk key={i} h="h-24" />
        ))}
      </div>
      <div>
        <Sk w="w-48" h="h-5" className="mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Sk w="w-24" h="h-4" />
              <Sk h="h-4" />
              <Sk w="w-16" h="h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ServiceSkeleton() {
  return (
    <div className="space-y-6">
      <Sk h="h-24" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Sk w="w-20" h="h-3" />
            <Sk h="h-10" />
          </div>
        ))}
      </div>
      <div>
        <Sk w="w-40" h="h-5" className="mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border border-[#e5e7eb] p-4">
              <div className="flex flex-1 gap-4">
                <Sk w="w-24" h="h-4" />
                <Sk w="w-32" h="h-4" />
                <Sk w="w-20" h="h-4" />
              </div>
              <Sk w="w-20" h="h-6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <Sk h="h-24" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Sk key={i} w="w-24" h="h-8" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between border border-[#e5e7eb] p-4">
            <div className="flex flex-1 gap-4">
              <Sk w="w-28" h="h-4" />
              <Sk w="w-20" h="h-4" />
              <Sk w="w-16" h="h-4" />
            </div>
            <Sk w="w-20" h="h-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WishlistSkeleton() {
  return (
    <div>
      <Sk w="w-32" h="h-6" className="mb-6" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Sk h="h-64" className="mb-3" />
            <Sk w="w-3/4" h="h-4" className="mb-1.5" />
            <Sk w="w-1/2" h="h-4" className="mb-2" />
            <div className="flex gap-1.5">
              {[1, 2, 3].map((j) => (
                <Sk key={j} w="w-4" h="h-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WaitingListSkeleton() {
  return (
    <div className="space-y-6">
      <Sk h="h-24" />
      <div>
        <Sk w="w-40" h="h-5" className="mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border border-[#e5e7eb] p-4">
              <Sk w="w-14" h="h-16" className="shrink-0" />
              <div className="flex-1 space-y-2">
                <Sk w="w-20" h="h-5" />
                <Sk w="w-40" h="h-4" />
                <Sk w="w-28" h="h-3" />
              </div>
              <div className="flex gap-2">
                <Sk w="w-8" h="h-8" />
                <Sk w="w-8" h="h-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReferSkeleton() {
  return (
    <div className="space-y-8">
      <Sk h="h-32" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Sk key={i} h="h-20" />
        ))}
      </div>
      <div className="space-y-3">
        <Sk w="w-36" h="h-5" />
        <Sk h="h-12" />
        <Sk h="h-12" />
      </div>
      <div className="space-y-3">
        <Sk w="w-36" h="h-5" />
        <Sk h="h-12" />
      </div>
    </div>
  );
}

export function FeedbackSkeleton() {
  return (
    <div className="space-y-6">
      <Sk w="w-44" h="h-6" className="mb-2" />
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Sk key={i} w="w-10" h="h-10" />
        ))}
      </div>
      <div className="space-y-1.5">
        <Sk w="w-24" h="h-3" />
        <Sk h="h-10" />
      </div>
      <div className="space-y-1.5">
        <Sk w="w-28" h="h-3" />
        <Sk h="h-10" />
      </div>
      <div className="space-y-1.5">
        <Sk w="w-20" h="h-3" />
        <Sk h="h-32" />
      </div>
      <Sk w="w-40" h="h-12" />
    </div>
  );
}

export function SubscriptionsSkeleton() {
  return (
    <div className="space-y-4">
      <Sk w="w-56" h="h-6" className="mb-6" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between border border-[#e5e7eb] p-4">
          <div className="space-y-1.5">
            <Sk w="w-40" h="h-4" />
            <Sk w="w-64" h="h-3" />
          </div>
          <Sk w="w-12" h="h-6" className="shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
