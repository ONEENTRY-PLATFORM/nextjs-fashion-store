import { Minus, Plus } from 'lucide-react';
import { QTY_CONTROL_LABELS as L } from '../data/commonLabels';

interface QtyControlProps {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  /** 'sm' = 28px buttons (MiniCart), 'md' = 32px buttons (CartPage). Default: 'md' */
  size?: 'sm' | 'md';
}

export function QtyControl({ value, onMinus, onPlus, size = 'md' }: QtyControlProps) {
  const btnClass = size === 'sm'
    ? 'w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors focus-visible:outline-none'
    : 'w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors focus-visible:outline-none';
  const iconSize = size === 'sm' ? 12 : 13;
  const borderClass = size === 'sm'
    ? 'flex items-center border border-gray-200'
    : 'flex items-center border border-[#d1d5db]';
  const spanClass = size === 'sm'
    ? 'w-8 text-center text-xs font-semibold'
    : 'w-9 text-center text-sm font-semibold';

  return (
    <div className={borderClass} role="group" aria-label={L.groupLabel}>
      <button onClick={onMinus} className={btnClass} aria-label={L.decreaseLabel} disabled={value <= 1}>
        <Minus size={iconSize} />
      </button>
      <span className={spanClass} role="status" aria-live="polite" aria-label={`${L.groupLabel}: ${value}`}>{value}</span>
      <button onClick={onPlus} className={btnClass} aria-label={L.increaseLabel}>
        <Plus size={iconSize} />
      </button>
    </div>
  );
}
