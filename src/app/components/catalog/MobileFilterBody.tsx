'use client';
import { Search, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';

import { ColorSwatch } from '@/app/components/ui/ColorSwatch';
import { COMMON_EMPTY_STATES } from '@/app/data/commonLabels';
import { fillTokens } from '@/app/utils/fillTokens';
import { useT } from '@/lib/oneentry/labels/DictContext';

import type { MobileFilterGroup } from './MobileFilterPanel';

/* ─── 18 × 18 px touch checkbox ─────────────────────────── */
export function CheckboxUI({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex size-4.5 shrink-0 items-center justify-center rounded-none border-[1.5px] transition-[background-color,border-color] duration-150 ${
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
  const lSearchInGroup = useT('interface_controls_search_in_group', COMMON_EMPTY_STATES.searchInGroup);
  const lNoResults = useT('interface_controls_no_results', COMMON_EMPTY_STATES.noResults);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = selectedFilters[group.key] ?? [];

  // Touch-friendly minimum row height for label rows
  const rowClass = 'flex items-center gap-3 cursor-pointer select-none min-h-11';
  const optionTextClass = 'text-xs text-[#333] leading-[1.3]';

  /* ── Size chips ── */
  if (group.type === 'size_chips') {
    return (
      <div className="px-5 pt-2 pb-5">
        <div className="flex flex-wrap gap-2">
          {group.options.map((opt) => {
            const optValue = opt.value ?? opt.label;
            const isSelected = selected.includes(optValue);
            return (
              <button
                key={optValue}
                onClick={() => onToggleFilter(group.key, optValue)}
                className={`leading-1.1 flex min-h-11 min-w-13 flex-col items-center justify-center rounded-none border-[1.5px] px-2.5 py-1 text-[13px] transition-all focus-visible:outline-none ${
                  isSelected
                    ? 'border-black bg-black font-bold text-white'
                    : 'border-[#d1d5db] bg-white font-normal text-[#333]'
                }`}
              >
                {opt.label}
                {opt.count !== undefined && <span className="mt-px text-[9px] opacity-60">({opt.count})</span>}
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
      ? group.options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
      : group.options;
    return (
      <div className="px-5 pt-2 pb-5">
        <div className="relative mb-3">
          <Search size={13} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder={fillTokens(lSearchInGroup, { group: group.label.toLowerCase() })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-none border border-[#d1d5db] bg-white pr-3 pl-8 text-[13px] focus-visible:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-black focus-visible:outline-none"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0">
          {visible.map((option) => {
            const isSelected = selected.includes(option.value ?? option.label);
            return (
              <label key={option.label} className={rowClass}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleFilter(group.key, option.value ?? option.label)}
                  className="sr-only"
                />
                <CheckboxUI checked={isSelected} />
                <span className={optionTextClass}>
                  {option.label}
                  {option.count !== undefined && <span className="text-gray-400"> ({option.count})</span>}
                </span>
              </label>
            );
          })}
          {visible.length === 0 && <p className="col-span-2 py-4 text-center text-xs text-gray-400">{lNoResults}</p>}
        </div>
      </div>
    );
  }

  /* ── Color swatches ── */
  if (group.type === 'color') {
    return (
      <div className="px-5 pt-2 pb-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0">
          {group.options.map((option) => {
            const isSelected = selected.includes(option.value ?? option.label);
            return (
              <label key={option.label} className={rowClass}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleFilter(group.key, option.value ?? option.label)}
                  className="sr-only"
                />
                <CheckboxUI checked={isSelected} />
                <ColorSwatch color={option.color} selected={isSelected} size={22} />
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
    <div className="px-5 pt-2 pb-5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-0">
        {group.options.map((option) => {
          const isSelected = selected.includes(option.value ?? option.label);
          return (
            <label key={option.label} className={rowClass}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleFilter(group.key, option.value ?? option.label)}
                className="sr-only"
              />
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
