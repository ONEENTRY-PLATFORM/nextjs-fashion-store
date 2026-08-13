'use client';
import { Link as LinkIcon, Trash2 } from 'lucide-react';

import { ImageWithFallback } from '@/app/components/ui/ImageWithFallback';
import { QtyControl } from '@/app/components/ui/QtyControl';
import type { CartItem } from '@/app/context/CartContext';
import { CART_LINE_LABELS, CART_ROW_LABELS } from '@/app/pages/cart/copy';
import { hexToColorName } from '@/app/utils/colorNames';
import { fmt } from '@/app/utils/formatPrice';
import { useDict } from '@/lib/oneentry/labels/DictContext';

interface CartBundleRowProps {
  bundleId: string;
  items: CartItem[];
  isLast: boolean;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemove: () => void;
}

export function CartBundleRow({ bundleId: _bundleId, items, isLast, onUpdateQuantity, onRemove }: CartBundleRowProps) {
  const CLL = useDict('interface_controls_cart_line_', CART_LINE_LABELS);
  const L = useDict('checkout_cart_row_', CART_ROW_LABELS);
  const bundleTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const bundleOriginal = items.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.quantity, 0);
  const qty = items[0]?.quantity ?? 1;

  return (
    <div className={isLast ? '' : 'border-b border-[#e5e7eb]'}>
      <div className="flex items-center justify-between border-b border-dashed border-[#e5e7eb] bg-[#fffbfb] px-5 pt-4 pb-2">
        <div className="flex items-center gap-2 text-accent">
          <LinkIcon size={13} />
          <span className="text-xs font-bold tracking-[0.12em] uppercase">{L.bundleLabel}</span>
          <span className="text-xs font-normal text-gray-400">{L.bundleRemoveable}</span>
        </div>
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-xs text-(--sale) transition-opacity hover:opacity-70 focus-visible:outline-none"
        >
          <Trash2 size={13} />
          <span>{L.bundleRemove}</span>
        </button>
      </div>

      {items.map((item, idx) => (
        <div
          key={item.id}
          className={`flex gap-4 bg-[#fffbfb] p-5 ${
            idx < items.length - 1 ? 'border-b border-dashed border-[#f0f0f0]' : ''
          }`}
        >
          <div className="w-4 shrink-0 pt-1" />

          <div className="relative h-35 w-27.5 shrink-0">
            <ImageWithFallback src={item.image} alt={item.name} fill sizes="110px" className="object-cover" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <p className="mb-0.5 text-xs tracking-widest text-gray-400 uppercase">{item.brand}</p>
              <p className="mb-1 text-sm leading-snug font-semibold">{item.name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>
                  {CLL.colorPrefix} {hexToColorName(item.color)}
                </span>
                <span>·</span>
                <span>
                  {CLL.skuPrefix} {item.sku}
                </span>
              </div>
            </div>
            {idx === items.length - 1 && (
              <div className="mt-4 flex items-center gap-3">
                <QtyControl
                  value={qty}
                  onMinus={() => onUpdateQuantity(item.id, -1)}
                  onPlus={() => onUpdateQuantity(item.id, +1)}
                />
                <span className="text-xs text-gray-400">{L.bundleQuantityNote}</span>
              </div>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-base font-bold">{fmt(item.price * item.quantity)}</p>
            {item.originalPrice && item.originalPrice > item.price && (
              <p className="text-xs text-gray-400 line-through">{fmt(item.originalPrice * item.quantity)}</p>
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between border-t border-[#fde8e8] bg-[#fff8f8] px-5 py-3">
        <span className="text-xs tracking-wide text-gray-500">{L.bundleTotal}</span>
        <div className="flex items-center gap-3">
          {bundleOriginal > bundleTotal && (
            <span className="text-xs font-semibold text-green-600">
              {L.bundleSavePrefix} {fmt(bundleOriginal - bundleTotal)}
            </span>
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
