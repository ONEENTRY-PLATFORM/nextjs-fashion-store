'use client';
import { Minus, Plus } from 'lucide-react';

import { useT } from '@/lib/oneentry/labels/DictContext';

export const QTY_CONTROL_LABELS = {
  groupLabel: 'Quantity',
  decreaseLabel: 'Decrease quantity',
  increaseLabel: 'Increase quantity',
} as const;

const L = QTY_CONTROL_LABELS;

interface QtyControlProps {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  /** 'sm' = 28px buttons (MiniCart), 'md' = 32px buttons (CartPage). */
  size?: 'sm' | 'md';
  /** Optional inventory ceiling from `CartItem.stockLimit`. When set, the `+` button is disabled at `value >= max` so the shopper can't push past OE's `stockqty` for that variant. */
  max?: number;
}

export function QtyControl({ value, onMinus, onPlus, size = 'md', max }: QtyControlProps) {
  const lGroup = useT('interface_controls_qty_group', L.groupLabel);
  const lDecrease = useT('interface_controls_qty_decrease', L.decreaseLabel);
  const lIncrease = useT('interface_controls_qty_increase', L.increaseLabel);
  const atMax = max !== undefined && value >= max;
  const btnClass =
    size === 'sm'
      ? 'w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors focus-visible:outline-none'
      : 'w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors focus-visible:outline-none';
  const iconSize = size === 'sm' ? 12 : 13;
  const borderClass =
    size === 'sm' ? 'flex items-center border border-gray-200' : 'flex items-center border border-[#d1d5db]';
  const spanClass = size === 'sm' ? 'w-8 text-center text-xs font-semibold' : 'w-9 text-center text-sm font-semibold';

  return (
    <div className={borderClass} role="group" aria-label={lGroup}>
      <button onClick={onMinus} className={btnClass} aria-label={lDecrease} disabled={value <= 1}>
        <Minus size={iconSize} />
      </button>
      <span className={spanClass} role="status" aria-live="polite" aria-label={`${lGroup}: ${value}`}>
        {value}
      </span>
      <button onClick={onPlus} className={btnClass} aria-label={lIncrease} disabled={atMax}>
        <Plus size={iconSize} />
      </button>
    </div>
  );
}
