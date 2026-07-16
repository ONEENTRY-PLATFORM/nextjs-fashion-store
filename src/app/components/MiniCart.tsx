'use client'
import { useEffect, useMemo } from 'react';
import { fmt } from '../utils/formatPrice';
import { ImageWithFallback } from './ImageWithFallback';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { X, ShoppingBag, Link as LinkIcon } from 'lucide-react';
import { QtyControl } from './QtyControl';
import { useCart, type CartItem } from '../context/CartContext';
import { useRouter } from 'next/navigation';
import { MINI_CART_LABELS as L } from '../data/cartLabels';
import { MINI_CART_ARIA_LABELS, MINI_CART_DYNAMIC_ARIA } from '../data/commonLabels';
import { useYourBagT } from '../../lib/oneentry/labels/YourBagLabelsContext';

type RenderRow =
  | { kind: 'item'; item: CartItem }
  | { kind: 'bundle'; bundleId: string; items: CartItem[] };

export function MiniCart() {
  const { items, miniCartOpen, closeMiniCart, removeItem, removeBundle, updateQuantity, subtotal, totalItems, personalDiscount, totalDue, couponCode, couponDiscount, preview, previewLoading, giftItems } = useCart();
  // Line items already reflect the sale price (item.price) with the
  // strike-through UX; keep the summary aligned so the shopper sees the
  // same numbers here and in the catalog / PDP. OE's `totalDue` is used
  // when OE actually knocked something extra off — loyalty tier, coupon,
  // or the shopper spent bonus points. Matches the CartPage /
  // DeliveryPage `finalTotal` logic.
  const bonusBurned = (preview?.bonusApplied ?? 0) > 0;
  const displayTotal = personalDiscount > 0 || couponDiscount > 0 || bonusBurned ? totalDue : subtotal;
  const router = useRouter();
  const trapRef = useFocusTrap(miniCartOpen, closeMiniCart);
  const lHeading      = useYourBagT('your_bag_title',          L.heading);
  const lSubtotal     = useYourBagT('your_bag_subtotal',       L.subtotal);
  const lShippingNote = useYourBagT('your_bag_text',           L.shippingNote);
  const lCheckout     = useYourBagT('your_bag_checkout_cta',   L.checkout);
  const lViewFullCart = useYourBagT('your_bag_view_fuul_cart', L.viewFullCart);

  const rows = useMemo<RenderRow[]>(() => {
    const result: RenderRow[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (!item.bundleId) {
        result.push({ kind: 'item', item });
      } else if (!seen.has(item.bundleId)) {
        seen.add(item.bundleId);
        result.push({ kind: 'bundle', bundleId: item.bundleId, items: items.filter(i => i.bundleId === item.bundleId) });
      }
    }
    return result;
  }, [items]);

  useEffect(() => {
    if (miniCartOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [miniCartOpen]);

  if (!miniCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={closeMiniCart} />

      {/* Drawer */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={MINI_CART_ARIA_LABELS.yourBag}
        className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white flex flex-col border-l border-gray-200"
      >

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} />
            <h2 className="text-sm tracking-[0.2em] uppercase font-bold">{lHeading}</h2>
            <span className="text-xs px-1.5 py-0.5 text-white font-semibold bg-primary-women">
              {totalItems}
            </span>
          </div>
          <button
            onClick={closeMiniCart}
            className="w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity focus-visible:outline-none"
            aria-label={L.closeLabel}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
              <ShoppingBag size={48} strokeWidth={1} className="text-gray-300" />
              <p className="text-sm text-gray-400 tracking-wide">{L.emptyTitle}</p>
              <button
                onClick={closeMiniCart}
                className="px-8 py-3 text-xs tracking-[0.2em] uppercase text-white bg-black hover:bg-primary-women active:bg-primary-men transition-colors duration-200 focus-visible:outline-none"
              >
                {L.emptyCta}
              </button>
            </div>
          ) : (
            <div>
              {rows.map((row) => {
                if (row.kind === 'item') {
                  const item = row.item;
                  return (
                    <div key={item.id} className="flex gap-4 px-6 py-5 border-b border-gray-100">
                      <div className="relative flex-shrink-0 w-20 h-24">
                        <ImageWithFallback src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="text-xs text-gray-400 tracking-widest uppercase mb-0.5">{item.brand}</p>
                          <p className="text-sm leading-tight mb-1 font-semibold">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{item.color}</span>
                            <span>·</span>
                            <span>Size {item.size}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <QtyControl
                            value={item.quantity}
                            max={item.stockLimit}
                            onMinus={() => updateQuantity(item.id, -1)}
                            onPlus={() => updateQuantity(item.id, +1)}
                            size="sm"
                          />
                          <div className="text-right">
                            <span className="text-sm font-semibold">{fmt(item.price * item.quantity)}</span>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <span className="block text-xs text-gray-400 line-through">{fmt(item.originalPrice * item.quantity)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="flex-shrink-0 self-start mt-0.5 w-6 h-6 flex items-center justify-center hover:opacity-60 transition-opacity focus-visible:outline-none" aria-label={MINI_CART_DYNAMIC_ARIA.removeFromCart(item.name)}>
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  );
                }

                // Bundle row
                const bundleTotal = row.items.reduce((s, i) => s + i.price * i.quantity, 0);
                const bundleOriginal = row.items.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.quantity, 0);
                const qty = row.items[0]?.quantity ?? 1;
                return (
                  <div key={row.bundleId} className="border-b border-gray-100">
                    {/* Bundle header */}
                    <div className="flex items-center justify-between px-6 pt-4 pb-2">
                      <div className="flex items-center gap-2">
                        <LinkIcon size={12} className="text-gray-400" />
                        <span className="text-xs tracking-widest uppercase font-semibold text-primary-women">{L.bundleLabel}</span>
                      </div>
                      <button
                        onClick={() => removeBundle(row.bundleId)}
                        className="w-6 h-6 flex items-center justify-center hover:opacity-60 transition-opacity focus-visible:outline-none text-gray-400 hover:text-black"
                        aria-label={MINI_CART_ARIA_LABELS.removeBundle}
                      >
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>

                    {/* Bundle items */}
                    {row.items.map((item, idx) => (
                      <div key={item.id} className={`flex gap-3 px-6 py-3 ${idx > 0 ? 'border-t border-dashed border-[#f0f0f0]' : ''}`}>
                        <div className="relative flex-shrink-0 w-16 h-20">
                          <ImageWithFallback src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 tracking-widest uppercase mb-0.5">{item.brand}</p>
                          <p className="text-xs leading-tight font-semibold mb-0.5">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.color} · Size {item.size}</p>
                          {/* Multiply by qty like every other line-item
                              price surface (single items + bundle footer);
                              without it a bundle line showed the per-unit
                              price while the surrounding rows summed a
                              qty-adjusted total, breaking the visual math.
                              Also guard the strike so it never renders
                              when `originalPrice <= item.price` — a stale
                              catalog entry with equal or lower "was" price
                              used to strike a smaller number. */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-semibold">{fmt(item.price * item.quantity)}</span>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <span className="text-xs text-gray-400 line-through">{fmt(item.originalPrice * item.quantity)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Bundle footer: qty + total */}
                    <div className="flex items-center justify-between px-6 pb-4 pt-3 border-t border-[#f0f0f0]">
                      <QtyControl
                        value={qty}
                        max={row.items[0]?.stockLimit}
                        onMinus={() => updateQuantity(row.items[0].id, -1)}
                        onPlus={() => updateQuantity(row.items[0].id, +1)}
                        size="sm"
                      />
                      <div className="text-right">
                        <span className="text-sm font-semibold">{fmt(bundleTotal)}</span>
                        {bundleOriginal > bundleTotal && <span className="block text-xs text-gray-400 line-through">{fmt(bundleOriginal)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {giftItems.map((gift) => (
                <div key={`gift-${gift.productId}`} className="flex gap-4 px-6 py-5 border-b border-gray-100">
                  <div className="relative flex-shrink-0 w-20 h-24">
                    <ImageWithFallback src={gift.image} alt={gift.name} fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-sm leading-tight mb-1 font-semibold">{gift.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] tracking-widest uppercase font-bold text-green-600 bg-[#f0fdf4] border border-[#bbf7d0] px-1.5 py-0.5">
                          Free gift
                        </span>
                        <span className="text-xs text-gray-500">Qty {gift.quantity}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end mt-3">
                      <div className="text-right">
                        <span className="text-sm font-semibold text-green-600 uppercase tracking-wide">Free</span>
                        {gift.price > 0 && (
                          <span className="block text-xs text-gray-400 line-through">{fmt(gift.price * gift.quantity)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="flex-shrink-0 px-6 py-5 border-t border-gray-200 bg-white">
            {/* Subtotal = sum of `item.price` (already sale price when
                the catalog / PDP overlay produced one). Line items above
                render the strike-through UX, so no redundant "Items
                discount" row here — that was the original math bug
                ("$31.5 − $3.5 = $35"). */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 tracking-wide">{lSubtotal}</span>
              <span className="text-base font-semibold">{fmt(subtotal)}</span>
            </div>
            {/* Skeleton for first preview — user sees SOMETHING is loading
                instead of a jumpy layout when the discount lines appear a
                moment later. Only fires when preview is truly pending
                (`previewLoading && !preview`). Subsequent refetches keep the
                old preview visible so numbers don't flash. */}
            {previewLoading && !preview ? (
              <>
                <div className="flex items-center justify-between mb-2" aria-busy="true">
                  <div className="h-3 w-24 bg-gray-100 animate-pulse" />
                  <div className="h-3 w-14 bg-gray-100 animate-pulse" />
                </div>
                <div className="flex items-center justify-between mb-4 pt-2 border-t border-gray-100" aria-busy="true">
                  <div className="h-3.5 w-14 bg-gray-100 animate-pulse" />
                  <div className="h-4 w-20 bg-gray-100 animate-pulse" />
                </div>
              </>
            ) : (
              <>
                {personalDiscount - couponDiscount > 0 && (
                  <div className="flex items-center justify-between mb-2 text-sm text-[var(--sale)]">
                    <span>Loyalty discount</span>
                    <span className="font-semibold">−{fmt(personalDiscount - couponDiscount)}</span>
                  </div>
                )}
                {couponDiscount > 0 && couponCode && (
                  <div className="flex items-center justify-between mb-2 text-sm text-[var(--sale)]">
                    <span>Promo ({couponCode})</span>
                    <span className="font-semibold">−{fmt(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4 pt-2 border-t border-gray-100">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-base font-bold">{fmt(displayTotal)}</span>
                </div>
                {(personalDiscount > 0 || couponDiscount > 0) && preview && (preview.totalDue !== subtotal) && (
                  <p className="text-[10px] text-gray-400 mb-3">Applied at checkout</p>
                )}
              </>
            )}
            <p className="text-xs text-gray-400 mb-4">{lShippingNote}</p>
            {/* CTA buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { closeMiniCart(); router.push('/checkout/delivery'); }}
                className="w-full py-4 text-sm tracking-[0.2em] uppercase text-white bg-black hover:bg-primary-women active:bg-primary-men font-bold transition-colors duration-200 focus-visible:outline-none"
              >
                {lCheckout}
              </button>
              <button
                onClick={() => { closeMiniCart(); router.push('/cart'); }}
                className="w-full py-3.5 text-sm tracking-[0.2em] uppercase border border-black font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200 focus-visible:outline-none"
              >
                {lViewFullCart}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
