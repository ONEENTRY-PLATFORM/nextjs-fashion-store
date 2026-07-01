'use client'
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ColorSwatch } from '../../components/ColorSwatch';
import { SALE_COLOR_OPTIONS } from '../../data/saleConfig';
import Image from 'next/image';
import { SALE_COLOR as SALE_RED } from '../../constants/colors';
import { SALE_PAGE_LABELS as L } from '../../data/salePageLabels';

const CheckMark = () => <Image src="/icons/ui/check.svg" alt="" width={8} height={8} unoptimized />;

export interface PillDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  onClear: () => void;
}

export function PillDropdown({ label, options, selected, onToggle, onClear }: PillDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const count = selected.length;
  const isActive = count > 0;

  return (
    <div
      ref={ref}
      className="relative flex-shrink-0"
      style={{ '--sale': SALE_RED } as React.CSSProperties}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3.5 py-2 text-xs tracking-wider uppercase transition-colors focus-visible:outline-none whitespace-nowrap rounded-none border ${
          isActive
            ? 'border-black bg-black text-white font-bold'
            : 'border-[#d1d5db] bg-white text-[#333] font-normal'
        }`}
      >
        {label}
        {isActive && (
          <span className="text-[10px] bg-[var(--sale)] text-white px-1 py-px rounded-none font-bold">
            {count}
          </span>
        )}
        <ChevronDown
          size={11}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'} ${
            isActive ? 'text-white' : 'text-[#555]'
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 bg-white border border-gray-200 shadow-lg z-50 mt-0.5 min-w-[180px] rounded-none">
          {isActive && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">{count} selected</span>
              <button onClick={onClear} className="text-xs underline text-gray-400 hover:text-black focus-visible:outline-none">{L.clearOne}</button>
            </div>
          )}
          {options.map(opt => {
            const checked = selected.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked={checked} onChange={() => onToggle(opt)} className="sr-only" />
                <span
                  className={`w-[14px] h-[14px] flex-shrink-0 border-[1.5px] flex items-center justify-center rounded-none ${
                    checked ? 'border-black bg-black' : 'border-[#ccc] bg-white'
                  }`}
                >
                  {checked && <CheckMark />}
                </span>
                <span className={`text-xs ${checked ? 'text-black font-semibold' : 'text-[#555] font-normal'}`}>{opt}</span>
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
}

export function ColorPillDropdown({ selected, onToggle, onClear }: ColorPillDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const count = selected.length;
  const isActive = count > 0;

  return (
    <div
      ref={ref}
      className="relative flex-shrink-0"
      style={{ '--sale': SALE_RED } as React.CSSProperties}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3.5 py-2 text-xs tracking-wider uppercase transition-colors focus-visible:outline-none whitespace-nowrap rounded-none border ${
          isActive
            ? 'border-black bg-black text-white font-bold'
            : 'border-[#d1d5db] bg-white text-[#333] font-normal'
        }`}
      >
        {L.colourFilter}
        {isActive && (
          <span className="text-[10px] bg-[var(--sale)] text-white px-1 py-px rounded-none font-bold">{count}</span>
        )}
        <ChevronDown
          size={11}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'} ${
            isActive ? 'text-white' : 'text-[#555]'
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 bg-white border border-gray-200 shadow-lg z-50 mt-0.5 p-3 min-w-[200px] rounded-none">
          {isActive && (
            <div className="flex justify-end mb-2">
              <button onClick={onClear} className="text-xs underline text-gray-400 hover:text-black focus-visible:outline-none">{L.clearOne}</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {SALE_COLOR_OPTIONS.map(opt => {
              const checked = selected.includes(opt.label);
              return (
                <label key={opt.label} className="flex items-center gap-2 py-1.5 cursor-pointer group">
                  <input type="checkbox" checked={checked} onChange={() => onToggle(opt.label)} className="sr-only" />
                  <ColorSwatch color={opt.color} selected={checked} size={14} />
                  <span className={`text-xs group-hover:text-black transition-colors ${checked ? 'text-black font-semibold' : 'text-[#555] font-normal'}`}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
