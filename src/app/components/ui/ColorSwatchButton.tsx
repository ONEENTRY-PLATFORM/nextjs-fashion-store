'use client';
import React from 'react';

import { CATALOG_VIEW_LABELS as CVL_FALLBACK } from '@/app/components/catalog/copy';
import { strikeColor } from '@/app/utils/colorUtils';
import { useDict } from '@/lib/oneentry/labels/DictContext';

interface ColorSwatchButtonProps {
  color: string;
  active: boolean;
  outOfStock?: boolean;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  /** Tailwind size classes for the swatch box. */
  sizeClass?: string;
}

/** 16×16 (default) color chip button with a diagonal strike for the out-of-stock variant. */
export function ColorSwatchButton({
  color,
  active,
  outOfStock = false,
  onClick,
  label,
  sizeClass = 'w-4 h-4',
}: ColorSwatchButtonProps) {
  const CVL = useDict('interface_controls_view_', CVL_FALLBACK);
  return (
    <button
      onClick={onClick}
      className={`relative ${sizeClass} shrink-0 transition-transform duration-150 focus-visible:outline-none ${
        active ? 'scale-125 border-2 border-black' : 'border border-gray-300'
      } ${outOfStock ? 'cursor-not-allowed opacity-60' : ''}`}
      style={{ backgroundColor: color }}
      title={outOfStock ? CVL.outOfStockLower : label}
      aria-label={label}
      aria-pressed={active}
      // Stable hook for the Playwright suite.
      data-testid="color-swatch"
      tabIndex={outOfStock ? -1 : 0}
      disabled={outOfStock}
    >
      {outOfStock && (
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(to bottom right, transparent calc(50% - 0.5px), ${strikeColor(color)} calc(50% - 0.5px), ${strikeColor(color)} calc(50% + 0.5px), transparent calc(50% + 0.5px))`,
          }}
        />
      )}
    </button>
  );
}
