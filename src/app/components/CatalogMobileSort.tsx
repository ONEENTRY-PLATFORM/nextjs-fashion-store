'use client'
import { X } from 'lucide-react';
import { useCatalogAccent } from '../context/CatalogAccentContext';
import { CATALOG_MOBILE_SORT_LABELS as L } from '../data/commonLabels';

const SORT_OPTIONS = L.options;

interface CatalogMobileSortProps {
  isOpen: boolean;
  onClose: () => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function CatalogMobileSort({
  isOpen,
  onClose,
  sortBy,
  onSortChange,
}: CatalogMobileSortProps) {
  const accentColor = useCatalogAccent();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] md:hidden flex flex-col justify-end font-[Inter,sans-serif]"
      style={{ '--accent': accentColor } as React.CSSProperties}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/45" />
      <div
        className="relative bg-white border-t-2 border-t-[var(--accent)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-[52px] border-b border-[#e5e7eb]">
          <h2 className="text-sm tracking-[0.2em] uppercase font-bold">{L.heading}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center focus-visible:outline-none -mr-1"
            aria-label={L.closeSort}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => {
              onSortChange(opt.value);
              onClose();
            }}
            className={`w-full flex items-center justify-between px-5 focus-visible:outline-none h-[52px] border-b border-[#f0f0f0] text-[13px] ${
              sortBy === opt.value ? 'bg-[#fafafa] font-semibold' : 'bg-white font-normal'
            }`}
          >
            {opt.label}
            {sortBy === opt.value && <span className="text-[var(--accent)]">✓</span>}
          </button>
        ))}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </div>
    </div>
  );
}
