'use client'
import { useState, useRef } from 'react';
import { X, Search } from 'lucide-react';
import type { MobileFilterGroup } from './MobileFilterPanel';
import Image from 'next/image';
import { ColorSwatch } from './ColorSwatch';
import { COMMON_EMPTY_STATES } from '../data/commonLabels';

/* ─── 18 × 18 px touch checkbox ─────────────────────────── */
export function CheckboxUI({ checked }: { checked: boolean }) {
  return (
    <span
      className={`w-[18px] h-[18px] border-[1.5px] rounded-none flex-shrink-0 flex items-center justify-center transition-[background-color,border-color] duration-150 ${
        checked ? 'border-black bg-black' : 'border-[#c8c8c8] bg-white'
      }`}
    >
      {checked && <Image src="/icons/ui/check.svg" alt="" width={10} height={10} unoptimized />}
    </span>
  );
}

interface FilterBodyProps {
  group: MobileFilterGroup;
  selectedFilters: Record<string, string[]>;
  onToggleFilter: (key: string, option: string) => void;
}

/* ─── Accordion content for each filter type ─────────────── */
export function FilterBody({ group, selectedFilters, onToggleFilter }: FilterBodyProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = selectedFilters[group.key] ?? [];

  // Touch-friendly minimum row height for label rows
  const rowClass = 'flex items-center gap-3 cursor-pointer select-none min-h-[44px]';
  const optionTextClass = 'text-xs text-[#333] leading-[1.3]';

  /* ── Size chips ── */
  if (group.type === 'size_chips') {
    return (
      <div className="px-5 pb-5 pt-2">
        <div className="flex flex-wrap gap-2">
          {group.options.map(opt => {
            const isSelected = selected.includes(opt.label);
            return (
              <button
                key={opt.label}
                onClick={() => onToggleFilter(group.key, opt.label)}
                className={`focus-visible:outline-none transition-all min-w-[52px] min-h-[44px] px-2.5 py-1 text-[13px] border-[1.5px] rounded-none flex flex-col items-center justify-center leading-[1.1] ${
                  isSelected
                    ? 'font-bold border-black bg-black text-white'
                    : 'font-normal border-[#d1d5db] bg-white text-[#333]'
                }`}
              >
                {opt.label}
                {opt.count !== undefined && (
                  <span className="text-[9px] opacity-60 mt-px">({opt.count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Search + checkbox ── */
  if (group.type === 'search_checkbox') {
    const visible = search.trim()
      ? group.options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
      : group.options;
    return (
      <div className="px-5 pb-5 pt-2">
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder={COMMON_EMPTY_STATES.searchInGroupTpl(group.label)}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 focus-visible:outline-none bg-white h-10 text-[13px] border border-[#d1d5db] rounded-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black focus-visible:outline-none">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0">
          {visible.map(option => {
            const isSelected = selected.includes(option.label);
            return (
              <label key={option.label} className={rowClass}>
                <input type="checkbox" checked={isSelected} onChange={() => onToggleFilter(group.key, option.label)} className="sr-only" />
                <CheckboxUI checked={isSelected} />
                <span className={optionTextClass}>
                  {option.label}
                  {option.count !== undefined && <span className="text-gray-400"> ({option.count})</span>}
                </span>
              </label>
            );
          })}
          {visible.length === 0 && (
            <p className="col-span-2 text-center py-4 text-xs text-gray-400">{COMMON_EMPTY_STATES.noResults}</p>
          )}
        </div>
      </div>
    );
  }

  /* ── Color swatches ── */
  if (group.type === 'color') {
    return (
      <div className="px-5 pb-5 pt-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0">
          {group.options.map(option => {
            const isSelected = selected.includes(option.label);
            return (
              <label key={option.label} className={rowClass}>
                <input type="checkbox" checked={isSelected} onChange={() => onToggleFilter(group.key, option.label)} className="sr-only" />
                <CheckboxUI checked={isSelected} />
                <ColorSwatch color={option.color!} selected={isSelected} size={22} />
                <span className={optionTextClass}>
                  {option.label}
                  {option.count !== undefined && <span className="text-gray-400"> ({option.count})</span>}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Default: 2-col checkbox grid ── */
  return (
    <div className="px-5 pb-5 pt-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-0">
        {group.options.map(option => {
          const isSelected = selected.includes(option.label);
          return (
            <label key={option.label} className={rowClass}>
              <input type="checkbox" checked={isSelected} onChange={() => onToggleFilter(group.key, option.label)} className="sr-only" />
              <CheckboxUI checked={isSelected} />
              <span className={optionTextClass}>
                {option.label}
                {option.count !== undefined && <span className="text-gray-400"> ({option.count})</span>}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
