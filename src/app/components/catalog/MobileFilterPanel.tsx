'use client';
import { ChevronDown, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useCatalogAccent } from '@/app/context/CatalogAccentContext';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { FilterBody } from './MobileFilterBody';

export const MOBILE_FILTER_ARIA = {
  productFilters: 'Product Filters',
  closeFilters: 'Close filters',
} as const;

export const MOBILE_FILTER_PANEL_LABELS = {
  filtersHeading: 'FILTERS',
  clearAll: 'Clear All',
} as const;

/* ─── Types ──────────────────────────────────────────────── */
export interface MobileFilterOption {
  label: string;
  /** Stable identity reported back through `onToggleFilter`. Defaults to `label`. */
  value?: string;
  count?: number;
  color?: string;
}

export interface MobileFilterGroup {
  label: string;
  key: string;
  options: MobileFilterOption[];
  type?: 'checkbox' | 'color' | 'section' | 'size_chips' | 'search_checkbox' | 'price_range' | 'measure_range';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filterGroups: MobileFilterGroup[];
  selectedFilters: Record<string, string[]>;
  onToggleFilter: (key: string, option: string) => void;
  onClearAll: () => void;
}

/* ─── Single accordion row ───────────────────────────────── */
function AccordionRow({
  group,
  isExpanded,
  onToggle,
  selectedFilters,
  onToggleFilter,
}: {
  group: MobileFilterGroup;
  isExpanded: boolean;
  onToggle: () => void;
  selectedFilters: Record<string, string[]>;
  onToggleFilter: (key: string, option: string) => void;
}) {
  const selCount = selectedFilters[group.key]?.length ?? 0;

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onToggle}
        className="flex h-13 w-full items-center justify-between px-5 focus-visible:outline-none"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2 text-[13px] font-bold tracking-[0.12em] uppercase">
          {group.label}
          {selCount > 0 && (
            <span className="text-[11px] font-semibold tracking-normal text-accent normal-case">({selCount})</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#555] transition-transform duration-360 ease-in-out ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-[max-height] duration-360 ease-in-out ${
          isExpanded ? 'max-h-300' : 'max-h-0'
        }`}
      >
        <FilterBody group={group} selectedFilters={selectedFilters} onToggleFilter={onToggleFilter} />
      </div>
    </div>
  );
}

/* ─── MobileFilterPanel ──────────────────────────────────── */
export function MobileFilterPanel({
  isOpen,
  onClose,
  filterGroups,
  selectedFilters,
  onToggleFilter,
  onClearAll,
}: Props) {
  const CVL = useDict('interface_controls_view_', MOBILE_FILTER_PANEL_LABELS);
  const aProductFilters = useT('interface_controls_mobile_filters_aria', MOBILE_FILTER_ARIA.productFilters);
  const aCloseFilters = useT('interface_controls_close_filters', MOBILE_FILTER_ARIA.closeFilters);
  const accentColor = useCatalogAccent();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    let nonSectionCount = 0;
    filterGroups.forEach((g) => {
      if (g.type === 'section') {
        init[g.key] = false;
      } else {
        init[g.key] = nonSectionCount < 2;
        nonSectionCount++;
      }
    });
    return init;
  });

  const toggleSection = (key: string) => setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const totalActive = Object.values(selectedFilters).flat().length;

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col bg-white font-sans"
      style={{ '--accent': accentColor } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label={aProductFilters}
    >
      {/* Fixed Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-5">
        <button
          onClick={onClose}
          className="-ml-2 flex size-10 items-center justify-center focus-visible:outline-none"
          aria-label={aCloseFilters}
        >
          <X size={20} strokeWidth={1.5} />
        </button>
        <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-[0.22em] uppercase">
          {CVL.filtersHeading}
          {totalActive > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-none bg-accent px-[5px] text-[11px] font-bold text-white">
              {totalActive}
            </span>
          )}
        </h2>
        <button
          onClick={() => {
            if (totalActive > 0) onClearAll();
          }}
          className={`min-w-15 text-right text-xs focus-visible:outline-none ${
            totalActive > 0 ? 'cursor-pointer text-[#111] underline' : 'cursor-default text-gray-300 no-underline'
          }`}
        >
          {CVL.clearAll}
        </button>
      </div>

      {/* Scrollable accordion body */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {filterGroups.map((group) => {
          if (group.type === 'section') {
            return (
              <div key={group.key} className="flex h-10 items-center gap-3 border-y border-gray-200 bg-[#f9f9f9] px-5">
                <span className="text-[9px] font-extrabold tracking-[0.22em] whitespace-nowrap text-gray-400 uppercase">
                  {group.label}
                </span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
            );
          }
          return (
            <AccordionRow
              key={group.key}
              group={group}
              isExpanded={!!expandedSections[group.key]}
              onToggle={() => toggleSection(group.key)}
              selectedFilters={selectedFilters}
              onToggleFilter={onToggleFilter}
            />
          );
        })}
      </div>
    </div>
  );
}
