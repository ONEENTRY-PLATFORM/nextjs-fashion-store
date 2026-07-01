'use client'
import React, { useState, useRef, useEffect, useTransition } from 'react';
import { Check } from 'lucide-react';
import type { ServiceCategory } from '../../../data/serviceData';
import { SERVICE_LABELS as L } from '../../../data/accountLabels';
import { submitServiceRequestAction } from '../../../../lib/oneentry/catalog/service-request-submit-action';
import { useFormPlaceholder } from '../../../../lib/oneentry/forms/FormPlaceholdersContext';

const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  alteration:  L.categoryLabels.alteration,
  repair:      L.categoryLabels.repair,
  cleaning:    L.categoryLabels.cleaning,
  restoration: L.categoryLabels.restoration,
  other:       L.categoryLabels.other,
};

const BLANK_FORM = { item: '', category: 'repair' as ServiceCategory, description: '', date: '' };
const inputClass = 'px-3 py-2 text-xs focus-visible:outline-none border border-[#e5e7eb] bg-white';
const labelClass = 'text-[10px] tracking-widest uppercase text-gray-400 font-bold';

export function ServiceRequestForm({ onCancel }: { onCancel?: () => void }) {
  const [form, setForm] = useState(BLANK_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const phItem        = useFormPlaceholder('service_request', 'item',        'placeholder_item',        L.placeholderItem);
  const phDescription = useFormPlaceholder('service_request', 'description', 'placeholder_description', L.placeholderDescription);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await submitServiceRequestAction({
        item: form.item,
        category: form.category,
        description: form.description,
        date: form.date,
      });
      if (!result.ok) { setError(result.error); return; }
      if (timerRef.current) clearTimeout(timerRef.current);
      setSubmitted(true);
      timerRef.current = setTimeout(() => {
        setSubmitted(false);
        setForm(BLANK_FORM);
        onCancel?.();
      }, 2500);
    });
  };

  return (
    <div className="mb-6 p-6 bg-[#fafafa] border border-[#e5e7eb]">
      <p className="text-xs tracking-[0.25em] uppercase mb-4 font-bold">{L.formHeading}</p>
      {submitted ? (
        <div className="flex items-center gap-3 py-6 justify-center">
          <div className="w-8 h-8 flex items-center justify-center bg-green-600">
            <Check size={16} color="#fff" />
          </div>
          <p className="text-sm font-bold">{L.successMessage}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{L.labelItem}</label>
            <input
              required
              value={form.item}
              onChange={e => setForm(f => ({ ...f, item: e.target.value }))}
              placeholder={phItem}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{L.labelServiceType}</label>
            <select
              required
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as ServiceCategory }))}
              className={`${inputClass} appearance-none`}
            >
              {(Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[]).map(k => (
                <option key={k} value={k}>{SERVICE_CATEGORY_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{L.labelDate}</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className={labelClass}>{L.labelDescription}</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={phDescription}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-end gap-3">
            {error && <p className="text-xs text-[var(--sale)] mr-auto" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className={`px-6 py-2.5 text-xs tracking-[0.15em] uppercase text-white focus-visible:outline-none transition-colors font-bold disabled:opacity-50 ${
                hovered ? 'bg-[var(--accent)]' : 'bg-black'
              }`}
            >
              {isPending ? '...' : L.submitButton}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
