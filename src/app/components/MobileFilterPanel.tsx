'use client'
import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { FilterBody } from './MobileFilterBody';
import { useCatalogAccent } from '../context/CatalogAccentContext';
import { MOBILE_FILTER_ARIA, CATALOG_VIEW_LABELS as CVL } from '../data/commonLabels';

/* ─── Types ──────────────────────────────────────────────── */
export interface MobileFilterOption {
  label: string;
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
  group, isExpanded, onToggle, selectedFilters, onToggleFilter,
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
        className="w-full flex items-center justify-between px-5 focus-visible:outline-none h-[52px]"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2 text-[13px] font-bold tracking-[0.12em] uppercase">
          {group.label}
          {selCount > 0 && (
            <span className="text-[11px] font-semibold tracking-normal normal-case text-[var(--accent)]">
              ({selCount})
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-[#555] transition-transform duration-[360ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-[max-height] duration-[360ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isExpanded ? 'max-h-[1200px]' : 'max-h-0'
        }`}
      >
        <FilterBody group={group} selectedFilters={selectedFilters} onToggleFilter={onToggleFilter} />
      </div>
    </div>
  );
}

/* ─── MobileFilterPanel ──────────────────────────────────── */
export function MobileFilterPanel({
  isOpen, onClose, filterGroups, selectedFilters, onToggleFilter, onClearAll,
}: Props) {
  const accentColor = useCatalogAccent();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    let nonSectionCount = 0;
    filterGroups.forEach(g => {
      if (g.type === 'section') {
        init[g.key] = false;
      } else {
        init[g.key] = nonSectionCount < 2;
        nonSectionCount++;
      }
    });
    return init;
  });

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const totalActive = Object.values(selectedFilters).flat().length;

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-white flex flex-col font-[Inter,sans-serif]"
      style={{ '--accent': accentColor } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label={MOBILE_FILTER_ARIA.productFilters}
    >
      {/* Fixed Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 border-b border-gray-200 h-14">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center focus-visible:outline-none -ml-2" aria-label={MOBILE_FILTER_ARIA.closeFilters}>
          <X size={20} strokeWidth={1.5} />
        </button>
        <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-[0.22em] uppercase">
          {CVL.filtersHeading}
          {totalActive > 0 && (
            <span className="flex items-center justify-center text-white min-w-[20px] h-5 rounded-none text-[11px] font-bold px-[5px] bg-[var(--accent)]">
              {totalActive}
            </span>
          )}
        </h2>
        <button
          onClick={() => { if (totalActive > 0) onClearAll(); }}
          className={`focus-visible:outline-none text-xs min-w-[60px] text-right ${
            totalActive > 0
              ? 'text-[#111] underline cursor-pointer'
              : 'text-gray-300 no-underline cursor-default'
          }`}
        >
          {CVL.clearAll}
        </button>
      </div>

      {/* Scrollable accordion body */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {filterGroups.map(group => {
          if (group.type === 'section') {
            return (
              <div key={group.key} className="flex items-center gap-3 px-5 border-y border-gray-200 h-10 bg-[#f9f9f9]">
                <span className="text-[9px] tracking-[0.22em] uppercase font-extrabold text-gray-400 whitespace-nowrap">
                  {group.label}
                </span>
                <span className="flex-1 h-px bg-gray-200" />
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
