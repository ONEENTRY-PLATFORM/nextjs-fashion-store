'use client'
import React from 'react';
import { strikeColor } from '../utils/colorUtils';
import { CATALOG_VIEW_LABELS as CVL } from '../data/commonLabels';

interface ColorSwatchButtonProps {
  color: string;
  active: boolean;
  outOfStock?: boolean;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  /** Tailwind size classes for the swatch box. Default "w-4 h-4". */
  sizeClass?: string;
}

/**
 * 16×16 (default) color chip button with a diagonal strike
 * for the out-of-stock variant.
 */
export function ColorSwatchButton({
  color, active, outOfStock = false, onClick, label, sizeClass = 'w-4 h-4',
}: ColorSwatchButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative ${sizeClass} flex-shrink-0 transition-transform duration-150 focus-visible:outline-none ${
        active ? 'scale-125 border-2 border-black' : 'border border-gray-300'
      } ${outOfStock ? 'opacity-60 cursor-not-allowed' : ''}`}
      style={{ backgroundColor: color }}
      title={outOfStock ? CVL.outOfStockLower : label}
      aria-label={label}
      aria-pressed={active}
      tabIndex={outOfStock ? -1 : 0}
      disabled={outOfStock}
    >
      {outOfStock && (
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom right, transparent calc(50% - 0.5px), ${strikeColor(color)} calc(50% - 0.5px), ${strikeColor(color)} calc(50% + 0.5px), transparent calc(50% + 0.5px))`,
          }}
        />
      )}
    </button>
  );
}
