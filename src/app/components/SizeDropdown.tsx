'use client'
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SIZE_DROPDOWN_LABELS as L } from '../data/commonLabels';

interface SizeDropdownProps {
  value: string;
  onChange: (s: string) => void;
  isShoe: boolean;
  /** Actual sizes for THIS product, loaded from OE. When provided, overrides
   *  the hardcoded clothing/shoe fallback. Single-item arrays render as
   *  static text (no dropdown). Empty array hides the widget entirely. */
  availableSizes?: string[];
}

export function SizeDropdown({ value, onChange, isShoe, availableSizes }: SizeDropdownProps) {
  const [open, setOpen] = useState(false);

  if (availableSizes && availableSizes.length === 0) return null;

  const options: readonly string[] = availableSizes && availableSizes.length > 0
    ? availableSizes
    : isShoe
      ? L.shoeSizes
      : value === L.oneSize ? [L.oneSize] : L.clothingSizes;

  const displayValue = value || options[0] || '';

  if (options.length <= 1) {
    return (
      <div className="inline-flex items-center px-3 py-1.5 text-xs border border-[#d1d5db] rounded-none min-w-[90px]">
        <span className="font-medium">{L.sizeLabel} {displayValue}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs focus-visible:outline-none border border-[#d1d5db] rounded-none min-w-[90px]"
      >
        <span className="font-medium">{L.sizeLabel} {displayValue}</span>
        <ChevronDown
          size={11}
          className={`ml-auto transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 bg-white z-30 min-w-full border border-[#d1d5db] border-t-0 rounded-none">
          {options.map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors focus-visible:outline-none ${
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
