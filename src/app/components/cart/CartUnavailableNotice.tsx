'use client';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

import { useCart } from '@/app/context/CartContext';
import { useT } from '@/lib/oneentry/labels/DictContext';

/** Toast shown when OE reports cart lines that went out of stock. */
export const CART_UNAVAILABLE_LABELS = {
  removedPrefix: 'Removed from your bag:',
  removedSuffix: '— no longer available.',
  itemSingular: 'item',
  itemPlural: 'items',
  dismiss: 'Dismiss notice',
} as const;

const L = CART_UNAVAILABLE_LABELS;

/** How long the notice stays on screen before self-dismissing. */
const AUTO_DISMISS_MS = 5000;

export function CartUnavailableNotice() {
  const { unavailableRemoved, dismissUnavailableNotice } = useCart();
  const lPrefix = useT('your_bag_removed_prefix', L.removedPrefix);
  const lSuffix = useT('your_bag_removed_suffix', L.removedSuffix);
  const lItem = useT('your_bag_item_singular', L.itemSingular);
  const lItems = useT('your_bag_item_plural', L.itemPlural);
  const lDismiss = useT('your_bag_dismiss_notice', L.dismiss);
  useEffect(() => {
    if (unavailableRemoved.length === 0) return;
    const t = setTimeout(dismissUnavailableNotice, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
    // A fresh removal batch replaces the array reference — timer restarts so the shopper always gets the full window per notice, not a leftover slice.
  }, [unavailableRemoved, dismissUnavailableNotice]);
  if (unavailableRemoved.length === 0) return null;
  const names = unavailableRemoved.map((it) => it.name).filter(Boolean);
  const summary =
    names.length > 0
      ? names.join(', ')
      : `${unavailableRemoved.length} ${unavailableRemoved.length === 1 ? lItem : lItems}`;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-200 border-b border-[#f59e0b] bg-[#fef3c7] font-sans"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 lg:px-8">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#b45309]" />
        <p className="flex-1 text-xs leading-relaxed text-[#78350f]">
          <span className="font-semibold">{lPrefix} </span>
          {summary}
          <span className="text-[#92400e]"> {lSuffix}</span>
        </p>
        <button
          type="button"
          onClick={dismissUnavailableNotice}
          aria-label={lDismiss}
          className="shrink-0 p-1 text-[#78350f] hover:opacity-70 focus-visible:outline-none"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
