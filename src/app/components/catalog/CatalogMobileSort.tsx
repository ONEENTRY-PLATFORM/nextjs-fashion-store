'use client';
import { X } from 'lucide-react';

import { useDict, useT } from '../../../lib/oneentry/labels/DictContext';
import { useCatalogAccent } from '../../context/CatalogAccentContext';
import { CATALOG_MOBILE_SORT_LABELS, CATALOG_SORT_LABELS } from '../../data/commonLabels';
import { SORT_OPTIONS } from './CatalogTemplate.types';

interface CatalogMobileSortProps {
  isOpen: boolean;
  onClose: () => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function CatalogMobileSort({ isOpen, onClose, sortBy, onSortChange }: CatalogMobileSortProps) {
  const L = useDict('interface_controls_mobile_sort_', CATALOG_MOBILE_SORT_LABELS);
  const CSL = useDict('interface_controls_sort_option_', CATALOG_SORT_LABELS);
  const accentColor = useCatalogAccent();
  const lHeading = useT('interface_controls_sort_heading', L.heading);
  const lCloseSort = useT('interface_controls_sort_close', L.closeSort);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col justify-end font-[Inter,sans-serif] md:hidden"
      style={{ '--accent': accentColor } as React.CSSProperties}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative border-t-2 border-t-accent bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-13 items-center justify-between border-b border-[#e5e7eb] px-5">
          <h2 className="text-sm font-bold tracking-[0.2em] uppercase">{lHeading}</h2>
          <button
            onClick={onClose}
            className="-mr-1 flex size-9 items-center justify-center focus-visible:outline-none"
            aria-label={lCloseSort}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              onSortChange(opt.value);
              onClose();
            }}
            className={`flex h-13 w-full items-center justify-between border-b border-[#f0f0f0] px-5 text-[13px] focus-visible:outline-none ${
              sortBy === opt.value ? 'bg-[#fafafa] font-semibold' : 'bg-white font-normal'
            }`}
          >
            {CSL[opt.labelKey]}
            {sortBy === opt.value && <span className="text-accent">✓</span>}
          </button>
        ))}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </div>
    </div>
  );
}
