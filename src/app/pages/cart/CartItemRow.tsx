'use client'
import Image from 'next/image';
import { Trash2, Heart } from 'lucide-react';
import { QtyControl } from '../../components/QtyControl';
import { SizeDropdown } from '../../components/SizeDropdown';
import type { CartItem } from '../../context/CartContext';
import { fmt } from '../../utils/formatPrice';
import { ACCENT_WOMEN as ACCENT } from '../../constants/colors';
import { CART_ROW_LABELS as L } from '../../data/cartLabels';
import { CART_LINE_LABELS as CLL } from '../../data/commonLabels';
import { hexToColorName } from '../../utils/colorNames';

const CheckMark = () => <Image src="/icons/ui/check.svg" alt="" width={8} height={8} unoptimized />;

interface CartItemRowProps {
  item: CartItem;
  isLast: boolean;
  isSelected: boolean;
  inWishlist: boolean;
  onToggleSelect: () => void;
  onToggleWishlist: () => void;
  onUpdateSize: (size: string) => void;
  onUpdateQuantity: (delta: number) => void;
  onRemove: () => void;
}

export function CartItemRow({
  item, isLast, isSelected, inWishlist,
  onToggleSelect, onToggleWishlist, onUpdateSize, onUpdateQuantity, onRemove,
}: CartItemRowProps) {
  const isShoe = item.sku.includes('-SH-');

  return (
    <div
      className={`flex gap-4 p-5 transition-colors duration-150 ${
        isLast ? '' : 'border-b border-[#e5e7eb]'
      } ${isSelected ? 'bg-[#fafafa]' : 'bg-white'}`}
    >
      <div className="flex-shrink-0 pt-1">
        <span
          className={`w-4 h-4 flex items-center justify-center cursor-pointer rounded-none border-[1.5px] ${
            isSelected ? 'border-black bg-black' : 'border-[#c8c8c8] bg-white'
          }`}
          onClick={onToggleSelect}
        >
          {isSelected && <CheckMark />}
        </span>
      </div>

      <div className="relative flex-shrink-0 w-[110px] h-[140px]">
        <Image src={item.image} alt={item.name} fill sizes="110px" className="object-cover" />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <p className="text-xs text-gray-400 tracking-widest uppercase mb-0.5">{item.brand}</p>
          <p className="text-sm mb-1 leading-snug font-semibold">{item.name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-2">
            <span>{CLL.colorPrefix} {hexToColorName(item.color)}</span>
            <span>·</span>
            <span>{CLL.skuPrefix} {item.sku}</span>
          </div>
          <SizeDropdown value={item.size} onChange={onUpdateSize} isShoe={isShoe} />
        </div>
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <QtyControl value={item.quantity} onMinus={() => onUpdateQuantity(-1)} onPlus={() => onUpdateQuantity(+1)} />
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleWishlist}
              className={`flex items-center gap-1 text-xs focus-visible:outline-none hover:opacity-70 transition-opacity ${
                inWishlist ? 'text-[var(--accent)]' : 'text-gray-500'
              }`}
              aria-label={L.removeWishlist}
            >
              <Heart size={14} fill={inWishlist ? ACCENT : 'none'} />
              <span className="hidden sm:inline">{L.wishlist}</span>
            </button>
            <button onClick={onRemove} className="flex items-center gap-1 text-xs focus-visible:outline-none hover:opacity-70 transition-opacity text-gray-500" aria-label={L.removeItem}>
              <Trash2 size={14} />
              <span className="hidden sm:inline">{L.remove}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-base font-bold">{fmt(item.price * item.quantity)}</p>
        {item.originalPrice && <p className="text-xs text-gray-400 line-through">{fmt(item.originalPrice * item.quantity)}</p>}
        {item.originalPrice && <p className="text-xs mt-0.5 text-[var(--sale)] font-semibold">-{fmt((item.originalPrice - item.price) * item.quantity)}</p>}
      </div>
    </div>
  );
}
