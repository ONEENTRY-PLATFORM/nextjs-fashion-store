'use client';
import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useCart } from '../context/CartContext';

/** How long the notice stays on screen before self-dismissing. Matches the
 *  cadence of typical UX toasts — long enough for a shopper to read the item
 *  name, short enough not to linger past the next interaction. */
const AUTO_DISMISS_MS = 5000;

export function CartUnavailableNotice() {
  const { unavailableRemoved, dismissUnavailableNotice } = useCart();
  useEffect(() => {
    if (unavailableRemoved.length === 0) return;
    const t = setTimeout(dismissUnavailableNotice, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
    // A fresh removal batch replaces the array reference — timer restarts so
    // the shopper always gets the full window per notice, not a leftover slice.
  }, [unavailableRemoved, dismissUnavailableNotice]);
  if (unavailableRemoved.length === 0) return null;
  const names = unavailableRemoved.map((it) => it.name).filter(Boolean);
  const summary = names.length > 0
    ? names.join(', ')
    : `${unavailableRemoved.length} item${unavailableRemoved.length === 1 ? '' : 's'}`;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[200] bg-[#fef3c7] border-b border-[#f59e0b] font-[Inter,sans-serif]"
    >
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-2.5 flex items-start gap-3">
        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-[#b45309]" />
        <p className="flex-1 text-xs text-[#78350f] leading-relaxed">
          <span className="font-semibold">
            {unavailableRemoved.length === 1 ? 'Removed from your bag: ' : 'Removed from your bag: '}
          </span>
          {summary}
          <span className="text-[#92400e]"> — no longer available.</span>
        </p>
        <button
          type="button"
          onClick={dismissUnavailableNotice}
          aria-label="Dismiss notice"
          className="p-1 text-[#78350f] hover:opacity-70 focus-visible:outline-none flex-shrink-0"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
