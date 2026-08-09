'use client';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { useDict, useT } from '../../../lib/oneentry/labels/DictContext';
import { ColorSwatch } from '../../components/ui/ColorSwatch';
import { SALE_COLOR as SALE_RED } from '../../constants/colors';
import { SALE_COLOR_OPTIONS } from '../../data/saleConfig';
import { SALE_PAGE_LABELS } from '../../data/salePageLabels';

const CheckMark = () => <Image src="/icons/ui/check.svg" alt="" width={8} height={8} unoptimized />;

/**
 * An option is either a plain value (label == value) or a value whose
 *  rendered wording is admin-editable and therefore kept apart from it.
 */
export type PillOption = string | { label: string; value: string };

export interface PillDropdownProps {
  label: string;
  options: readonly PillOption[];
  selected: string[];
  onToggle: (val: string) => void;
  onClear: () => void;
}

export function PillDropdown({ label, options, selected, onToggle, onClear }: PillDropdownProps) {
  const L = useDict('sale_page_', SALE_PAGE_LABELS);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const count = selected.length;
  const isActive = count > 0;

  const lSelected = useT('sale_page_selected_suffix', L.selectedSuffix);

  return (
    <div ref={ref} className="relative shrink-0" style={{ '--sale': SALE_RED } as React.CSSProperties}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-none border px-3.5 py-2 text-xs tracking-wider whitespace-nowrap uppercase transition-colors focus-visible:outline-none ${
          isActive ? 'border-black bg-black font-bold text-white' : 'border-[#d1d5db] bg-white font-normal text-[#333]'
        }`}
      >
        {label}
        {isActive && (
          <span className="rounded-none bg-(--sale) px-1 py-px text-[10px] font-bold text-white">{count}</span>
        )}
        <ChevronDown
          size={11}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'} ${
            isActive ? 'text-white' : 'text-[#555]'
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-0.5 min-w-45 rounded-none border border-gray-200 bg-white shadow-lg">
          {isActive && (
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <span className="text-xs text-gray-500">
                {count} {lSelected}
              </span>
              <button
                onClick={onClear}
                className="text-xs text-gray-400 underline hover:text-black focus-visible:outline-none"
              >
                {L.clearOne}
              </button>
            </div>
          )}
          {options.map((opt) => {
            const value = typeof opt === 'string' ? opt : opt.value;
            const text = typeof opt === 'string' ? opt : opt.label;
            const checked = selected.includes(value);
            return (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-gray-50"
              >
                <input type="checkbox" checked={checked} onChange={() => onToggle(value)} className="sr-only" />
                <span
                  className={`flex size-3.5 shrink-0 items-center justify-center rounded-none border-[1.5px] ${
                    checked ? 'border-black bg-black' : 'border-[#ccc] bg-white'
                  }`}
                >
                  {checked && <CheckMark />}
                </span>
                <span className={`text-xs ${checked ? 'font-semibold text-black' : 'font-normal text-[#555]'}`}>
                  {text}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface ColorPillDropdownProps {
  selected: string[];
  onToggle: (val: string) => void;
  onClear: () => void;
  /**
   * Optional list of `{label, color}` swatches derived from the visible
   *  products. When omitted, falls back to the static SALE_COLOR_OPTIONS.
   */
  options?: readonly { label: string; color: string }[];
}

export function ColorPillDropdown({ selected, onToggle, onClear, options }: ColorPillDropdownProps) {
  const L = useDict('sale_page_', SALE_PAGE_LABELS);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const count = selected.length;
  const isActive = count > 0;

  return (
    <div ref={ref} className="relative shrink-0" style={{ '--sale': SALE_RED } as React.CSSProperties}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-none border px-3.5 py-2 text-xs tracking-wider whitespace-nowrap uppercase transition-colors focus-visible:outline-none ${
          isActive ? 'border-black bg-black font-bold text-white' : 'border-[#d1d5db] bg-white font-normal text-[#333]'
        }`}
      >
        {L.colourFilter}
        {isActive && (
          <span className="rounded-none bg-(--sale) px-1 py-px text-[10px] font-bold text-white">{count}</span>
        )}
        <ChevronDown
          size={11}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'} ${
            isActive ? 'text-white' : 'text-[#555]'
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-0.5 min-w-50 rounded-none border border-gray-200 bg-white p-3 shadow-lg">
          {isActive && (
            <div className="mb-2 flex justify-end">
              <button
                onClick={onClear}
                className="text-xs text-gray-400 underline hover:text-black focus-visible:outline-none"
              >
                {L.clearOne}
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {(options ?? SALE_COLOR_OPTIONS).map((opt) => {
              const checked = selected.includes(opt.label);
              return (
                <label key={opt.label} className="group flex cursor-pointer items-center gap-2 py-1.5">
                  <input type="checkbox" checked={checked} onChange={() => onToggle(opt.label)} className="sr-only" />
                  <ColorSwatch color={opt.color} selected={checked} size={14} />
                  <span
                    className={`text-xs transition-colors group-hover:text-black ${checked ? 'font-semibold text-black' : 'font-normal text-[#555]'}`}
                  >
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
