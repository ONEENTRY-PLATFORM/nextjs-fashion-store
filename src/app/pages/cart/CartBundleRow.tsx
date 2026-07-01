'use client'
import Image from 'next/image';
import { Trash2, Link as LinkIcon } from 'lucide-react';
import { QtyControl } from '../../components/QtyControl';
import type { CartItem } from '../../context/CartContext';
import { fmt } from '../../utils/formatPrice';
import { CART_ROW_LABELS as L } from '../../data/cartLabels';
import { CART_LINE_LABELS as CLL } from '../../data/commonLabels';
import { hexToColorName } from '../../utils/colorNames';

interface CartBundleRowProps {
  bundleId: string;
  items: CartItem[];
  isLast: boolean;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemove: () => void;
}

export function CartBundleRow({ bundleId: _bundleId, items, isLast, onUpdateQuantity, onRemove }: CartBundleRowProps) {
  const bundleTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const bundleOriginal = items.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.quantity, 0);
  const qty = items[0]?.quantity ?? 1;

  return (
    <div className={isLast ? '' : 'border-b border-[#e5e7eb]'}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-dashed border-[#e5e7eb] bg-[#fffbfb]">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <LinkIcon size={13} />
          <span className="text-xs tracking-[0.12em] uppercase font-bold">{L.bundleLabel}</span>
          <span className="text-xs text-gray-400 font-normal">{L.bundleRemoveable}</span>
        </div>
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-xs focus-visible:outline-none hover:opacity-70 transition-opacity text-[var(--sale)]"
        >
          <Trash2 size={13} />
          <span>{L.bundleRemove}</span>
        </button>
      </div>

      {items.map((item, idx) => (
        <div
          key={item.id}
          className={`flex gap-4 p-5 bg-[#fffbfb] ${
            idx < items.length - 1 ? 'border-b border-dashed border-[#f0f0f0]' : ''
          }`}
        >
          <div className="flex-shrink-0 pt-1 w-4" />

          <div className="relative flex-shrink-0 w-[110px] h-[140px]">
            <Image src={item.image} alt={item.name} fill sizes="110px" className="object-cover" />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <p className="text-xs text-gray-400 tracking-widest uppercase mb-0.5">{item.brand}</p>
              <p className="text-sm mb-1 leading-snug font-semibold">{item.name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>{CLL.colorPrefix} {hexToColorName(item.color)}</span>
                <span>·</span>
                <span>{CLL.skuPrefix} {item.sku}</span>
              </div>
            </div>
            {idx === items.length - 1 && (
              <div className="flex items-center gap-3 mt-4">
                <QtyControl value={qty} onMinus={() => onUpdateQuantity(item.id, -1)} onPlus={() => onUpdateQuantity(item.id, +1)} />
                <span className="text-xs text-gray-400">{L.bundleQuantityNote}</span>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 text-right">
            <p className="text-base font-bold">{fmt(item.price * item.quantity)}</p>
            {item.originalPrice && <p className="text-xs text-gray-400 line-through">{fmt(item.originalPrice * item.quantity)}</p>}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between px-5 py-3 bg-[#fff8f8] border-t border-[#fde8e8]">
        <span className="text-xs text-gray-500 tracking-wide">{L.bundleTotal}</span>
        <div className="flex items-center gap-3">
          {bundleOriginal > bundleTotal && (
            <span className="text-xs text-green-600 font-semibold">{L.bundleSavePrefix} {fmt(bundleOriginal - bundleTotal)}</span>
          )}
          <span className="text-sm font-bold">{fmt(bundleTotal)}</span>
          {bundleOriginal > bundleTotal && (
            <span className="text-xs text-gray-400 line-through">{fmt(bundleOriginal)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
