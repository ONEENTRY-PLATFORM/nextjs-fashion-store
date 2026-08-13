'use client';
import { Heart, Trash2 } from 'lucide-react';
import Image from 'next/image';

import { ImageWithFallback } from '@/app/components/ui/ImageWithFallback';
import { QtyControl } from '@/app/components/ui/QtyControl';
import { SizeDropdown } from '@/app/components/ui/SizeDropdown';
import { ACCENT_WOMEN as ACCENT } from '@/app/constants/colors';
import type { CartItem } from '@/app/context/CartContext';
import { hexToColorName } from '@/app/utils/colorNames';
import { fmt } from '@/app/utils/formatPrice';
import { useDict } from '@/lib/oneentry/labels/DictContext';

export const CART_LINE_LABELS = {
  colorPrefix: 'Color:',
  skuPrefix: 'SKU:',
} as const;

export const CART_ROW_LABELS = {
  wishlist: 'Wishlist',
  remove: 'Remove',
  removeWishlist: 'Move to wishlist',
  removeItem: 'Remove item',
} as const;

const CheckMark = () => <Image src="/icons/ui/check.svg" alt="" width={8} height={8} unoptimized />;

interface CartItemRowProps {
  item: CartItem;
  isLast: boolean;
  isSelected: boolean;
  inWishlist: boolean;
  /** Real sizes for this product from OE — overrides SizeDropdown fallback. */
  availableSizes?: string[];
  onToggleSelect: () => void;
  onToggleWishlist: () => void;
  onUpdateSize: (size: string) => void;
  onUpdateQuantity: (delta: number) => void;
  onRemove: () => void;
}

export function CartItemRow({
  item,
  isLast,
  isSelected,
  inWishlist,
  availableSizes,
  onToggleSelect,
  onToggleWishlist,
  onUpdateSize,
  onUpdateQuantity,
  onRemove,
}: CartItemRowProps) {
  const CLL = useDict('interface_controls_cart_line_', CART_LINE_LABELS);
  const L = useDict('checkout_cart_row_', CART_ROW_LABELS);
  const isShoe = item.sku.includes('-SH-');

  return (
    <div
      className={`flex gap-4 p-5 transition-colors duration-150 ${
        isLast ? '' : 'border-b border-[#e5e7eb]'
      } ${isSelected ? 'bg-[#fafafa]' : 'bg-white'}`}
    >
      <div className="shrink-0 pt-1">
        <span
          className={`flex size-4 cursor-pointer items-center justify-center rounded-none border-[1.5px] ${
            isSelected ? 'border-black bg-black' : 'border-[#c8c8c8] bg-white'
          }`}
          onClick={onToggleSelect}
        >
          {isSelected && <CheckMark />}
        </span>
      </div>

      <div className="relative h-35 w-27.5 shrink-0">
        <ImageWithFallback src={item.image} alt={item.name} fill sizes="110px" className="object-cover" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="mb-0.5 text-xs tracking-widest text-gray-400 uppercase">{item.brand}</p>
          <p className="mb-1 text-sm leading-snug font-semibold">{item.name}</p>
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>
              {CLL.colorPrefix} {hexToColorName(item.color)}
            </span>
            <span>·</span>
            <span>
              {CLL.skuPrefix} {item.sku}
            </span>
          </div>
          <SizeDropdown value={item.size} onChange={onUpdateSize} isShoe={isShoe} availableSizes={availableSizes} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <QtyControl
            value={item.quantity}
            max={item.stockLimit}
            onMinus={() => onUpdateQuantity(-1)}
            onPlus={() => onUpdateQuantity(+1)}
          />
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleWishlist}
              className={`flex items-center gap-1 text-xs transition-opacity hover:opacity-70 focus-visible:outline-none ${
                inWishlist ? 'text-accent' : 'text-gray-500'
              }`}
              aria-label={L.removeWishlist}
            >
              <Heart size={14} style={{ fill: inWishlist ? ACCENT : 'none' }} />
              <span className="hidden sm:inline">{L.wishlist}</span>
            </button>
            <button
              onClick={onRemove}
              className="flex items-center gap-1 text-xs text-gray-500 transition-opacity hover:opacity-70 focus-visible:outline-none"
              aria-label={L.removeItem}
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">{L.remove}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-base font-bold">{fmt(item.price * item.quantity)}</p>
        {item.originalPrice && item.originalPrice > item.price && (
          <>
            <p className="text-xs text-gray-400 line-through">{fmt(item.originalPrice * item.quantity)}</p>
            <p className="mt-0.5 text-xs font-semibold text-(--sale)">
              -{fmt((item.originalPrice - item.price) * item.quantity)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
