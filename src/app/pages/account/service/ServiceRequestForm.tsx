'use client';
import { Check } from 'lucide-react';
import React, { useEffect, useRef, useState, useTransition } from 'react';

import { SERVICE_LABELS as L_FALLBACK } from '@/app/data/accountLabels';
import type { ServiceCategory } from '@/app/data/serviceData';
import { submitServiceRequestAction } from '@/lib/oneentry/catalog/service-request-submit-action';
import { useFormLabel, useFormPlaceholder } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { useDict } from '@/lib/oneentry/labels/DictContext';

const BLANK_FORM = { item: '', category: 'repair' as ServiceCategory, description: '', date: '' };
const inputClass = 'px-3 py-2 text-xs focus-visible:outline-none border border-[#e5e7eb] bg-white';
const labelClass = 'text-[10px] tracking-widest uppercase text-gray-400 font-bold';

export function ServiceRequestForm({ onCancel }: { onCancel?: () => void }) {
  const L = useDict('service_maintenance_', L_FALLBACK);
  // Nested objects are structure to `mergeDict`, so the category names get
  // their own overlay rather than staying frozen in code.
  const CATEGORIES = useDict('service_maintenance_category_', L_FALLBACK.categoryLabels);
  const [form, setForm] = useState(BLANK_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Field labels and the submit caption belong to the form entity in OE, not
  // to the `service_maintenance` system-text set. `SERVICE_LABELS` is the
  // offline fallback.
  const lbItem = useFormLabel('service_request', 'item', L.labelItem);
  const lbServiceType = useFormLabel('service_request', 'category', L.labelServiceType);
  const lbDate = useFormLabel('service_request', 'date', L.labelDate);
  const lbDescription = useFormLabel('service_request', 'description', L.labelDescription);
  const lbSubmit = useFormLabel('service_request', 'service_request_submit', L.submitButton);

  const phItem = useFormPlaceholder('service_request', 'item', 'placeholder_item', L.placeholderItem);
  const phDescription = useFormPlaceholder(
    'service_request',
    'description',
    'placeholder_description',
    L.placeholderDescription,
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
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
      if (!result.ok) {
        setError(result.error);
        return;
      }
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
    <div className="mb-6 border border-[#e5e7eb] bg-[#fafafa] p-6">
      <p className="mb-4 text-xs font-bold tracking-[0.25em] uppercase">{L.formHeading}</p>
      {submitted ? (
        <div className="flex items-center justify-center gap-3 py-6">
          <div className="flex size-8 items-center justify-center bg-green-600">
            <Check size={16} color="#fff" />
          </div>
          <p className="text-sm font-bold">{L.successMessage}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{lbItem}</label>
            <input
              required
              value={form.item}
              onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
              placeholder={phItem}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{lbServiceType}</label>
            <select
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ServiceCategory }))}
              className={`${inputClass} appearance-none`}
            >
              {(Object.keys(CATEGORIES) as ServiceCategory[]).map((k) => (
                <option key={k} value={k}>
                  {CATEGORIES[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{lbDate}</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className={labelClass}>{lbDescription}</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={phDescription}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="flex items-center justify-end gap-3 sm:col-span-2">
            {error && (
              <p className="mr-auto text-xs text-(--sale)" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isPending}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className={`px-6 py-2.5 text-xs font-bold tracking-[0.15em] text-white uppercase transition-colors focus-visible:outline-none disabled:opacity-50 ${
                hovered ? 'bg-accent' : 'bg-black'
              }`}
            >
              {isPending ? '...' : lbSubmit}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
