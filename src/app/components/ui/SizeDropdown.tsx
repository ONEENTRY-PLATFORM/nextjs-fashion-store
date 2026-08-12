'use client';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { SIZE_DROPDOWN_LABELS } from '@/app/components/ui/copy';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

interface SizeDropdownProps {
  value: string;
  onChange: (s: string) => void;
  isShoe: boolean;
  /**
   * Actual sizes for THIS product, loaded from OE. When provided, overrides
   *  the hardcoded clothing/shoe fallback. Single-item arrays render as
   *  static text (no dropdown). Empty array hides the widget entirely.
   */
  availableSizes?: string[];
}

export function SizeDropdown({ value, onChange, isShoe, availableSizes }: SizeDropdownProps) {
  const L = useDict('interface_controls_size_', SIZE_DROPDOWN_LABELS);
  const [open, setOpen] = useState(false);
  const lSize = useT('interface_controls_size_prefix', L.sizeLabel);

  if (availableSizes && availableSizes.length === 0) return null;

  const options: readonly string[] =
    availableSizes && availableSizes.length > 0
      ? availableSizes
      : isShoe
        ? L.shoeSizes
        : value === L.oneSize
          ? [L.oneSize]
          : L.clothingSizes;

  const displayValue = value || options[0] || '';

  if (options.length <= 1) {
    return (
      <div className="inline-flex min-w-22.5 items-center rounded-none border border-[#d1d5db] px-3 py-1.5 text-xs">
        <span className="font-medium">
          {lSize} {displayValue}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-22.5 items-center gap-1.5 rounded-none border border-[#d1d5db] px-3 py-1.5 text-xs focus-visible:outline-none"
      >
        <span className="font-medium">
          {lSize} {displayValue}
        </span>
        <ChevronDown
          size={11}
          className={`ml-auto transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 min-w-full rounded-none border border-t-0 border-[#d1d5db] bg-white">
          {options.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50 focus-visible:outline-none ${
                s === value ? 'font-bold' : 'font-normal'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
