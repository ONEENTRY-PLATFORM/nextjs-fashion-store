'use client';
import { Link as LinkIcon, ShoppingBag, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { ImageWithFallback } from '@/app/components/ui/ImageWithFallback';
import { QtyControl } from '@/app/components/ui/QtyControl';
import { type CartItem, useCart } from '@/app/context/CartContext';
import { MINI_CART_LABELS } from '@/app/data/cartLabels';
import { MINI_CART_ARIA_LABELS, MINI_CART_DYNAMIC_ARIA } from '@/app/data/commonLabels';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { fillTokens } from '@/app/utils/fillTokens';
import { fmt } from '@/app/utils/formatPrice';
import { useRouter } from '@/lib/i18n/navigation';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

type RenderRow = { kind: 'item'; item: CartItem } | { kind: 'bundle'; bundleId: string; items: CartItem[] };

export function MiniCart() {
  const L = useDict('your_bag_mini_', MINI_CART_LABELS);
  const {
    items,
    miniCartOpen,
    closeMiniCart,
    removeItem,
    removeBundle,
    updateQuantity,
    subtotal,
    totalItems,
    personalDiscount,
    totalDue,
    couponCode,
    couponDiscount,
    preview,
    previewLoading,
    giftItems,
  } = useCart();
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
  const lHeading = useT('your_bag_title', L.heading);
  const lSubtotal = useT('your_bag_subtotal', L.subtotal);
  const lShippingNote = useT('your_bag_text', L.shippingNote);
  const lCheckout = useT('your_bag_checkout_cta', L.checkout);
  const lViewFullCart = useT('your_bag_view_fuul_cart', L.viewFullCart);
  const lSize = useT('your_bag_size_prefix', L.sizePrefix);
  const lQty = useT('your_bag_qty_prefix', L.qtyPrefix);
  const lFreeGift = useT('your_bag_free_gift', L.freeGift);
  const lFree = useT('your_bag_free', L.free);
  const lLoyalty = useT('your_bag_loyalty_discount', L.loyaltyDiscount);
  const lPromo = useT('your_bag_promo_prefix', L.promoPrefix);
  const lTotal = useT('your_bag_total', L.total);
  const lAppliedAtCheckout = useT('your_bag_applied_at_checkout', L.appliedAtCheckout);
  const aPanel = useT('your_bag_aria_panel', MINI_CART_ARIA_LABELS.yourBag);
  const aRemoveBundle = useT('your_bag_remove_bundle', MINI_CART_ARIA_LABELS.removeBundle);
  const aRemoveItem = useT('your_bag_remove_item', MINI_CART_DYNAMIC_ARIA.removeFromCart);

  const rows = useMemo<RenderRow[]>(() => {
    const result: RenderRow[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (!item.bundleId) {
        result.push({ kind: 'item', item });
      } else if (!seen.has(item.bundleId)) {
        seen.add(item.bundleId);
        result.push({
          kind: 'bundle',
          bundleId: item.bundleId,
          items: items.filter((i) => i.bundleId === item.bundleId),
        });
      }
    }
    return result;
  }, [items]);

  useEffect(() => {
    if (miniCartOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [miniCartOpen]);

  if (!miniCartOpen) return null;

  return (
    <div className="fixed inset-0 z-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={closeMiniCart} />

      {/* Drawer */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={aPanel}
        className="absolute inset-y-0 right-0 flex w-full max-w-105 flex-col border-l border-gray-200 bg-white"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} />
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase">{lHeading}</h2>
            <span className="bg-primary-women px-1.5 py-0.5 text-xs font-semibold text-white">{totalItems}</span>
          </div>
          <button
            onClick={closeMiniCart}
            className="flex size-8 items-center justify-center transition-opacity hover:opacity-70 focus-visible:outline-none"
            aria-label={L.closeLabel}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <ShoppingBag size={48} strokeWidth={1} className="text-gray-300" />
              <p className="text-sm tracking-wide text-gray-400">{L.emptyTitle}</p>
              <button
                onClick={closeMiniCart}
                className="bg-black px-8 py-3 text-xs tracking-[0.2em] text-white uppercase transition-colors duration-200 hover:bg-primary-women focus-visible:outline-none active:bg-primary-men"
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
                    <div key={item.id} className="flex gap-4 border-b border-gray-100 px-6 py-5">
                      <div className="relative h-24 w-20 shrink-0">
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <p className="mb-0.5 text-xs tracking-widest text-gray-400 uppercase">{item.brand}</p>
                          <p className="mb-1 text-sm leading-tight font-semibold">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{item.color}</span>
                            <span>·</span>
                            <span>
                              {lSize} {item.size}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
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
                              <span className="block text-xs text-gray-400 line-through">
                                {fmt(item.originalPrice * item.quantity)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center self-start transition-opacity hover:opacity-60 focus-visible:outline-none"
                        aria-label={fillTokens(aRemoveItem, { name: item.name })}
                      >
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
                        <span className="text-xs font-semibold tracking-widest text-primary-women uppercase">
                          {L.bundleLabel}
                        </span>
                      </div>
                      <button
                        onClick={() => removeBundle(row.bundleId)}
                        className="flex size-6 items-center justify-center text-gray-400 transition-opacity hover:text-black hover:opacity-60 focus-visible:outline-none"
                        aria-label={aRemoveBundle}
                      >
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>

                    {/* Bundle items */}
                    {row.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`flex gap-3 px-6 py-3 ${idx > 0 ? 'border-t border-dashed border-[#f0f0f0]' : ''}`}
                      >
                        <div className="relative h-20 w-16 shrink-0">
                          <ImageWithFallback
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="mb-0.5 text-xs tracking-widest text-gray-400 uppercase">{item.brand}</p>
                          <p className="mb-0.5 text-xs leading-tight font-semibold">{item.name}</p>
                          <p className="text-xs text-gray-400">
                            {item.color} · {lSize} {item.size}
                          </p>
                          {/* Multiply by qty like every other line-item
                              price surface (single items + bundle footer);
                              without it a bundle line showed the per-unit
                              price while the surrounding rows summed a
                              qty-adjusted total, breaking the visual math.
                              Also guard the strike so it never renders
                              when `originalPrice <= item.price` — a stale
                              catalog entry with equal or lower "was" price
                              used to strike a smaller number. */}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs font-semibold">{fmt(item.price * item.quantity)}</span>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <span className="text-xs text-gray-400 line-through">
                                {fmt(item.originalPrice * item.quantity)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Bundle footer: qty + total */}
                    <div className="flex items-center justify-between border-t border-[#f0f0f0] px-6 pt-3 pb-4">
                      <QtyControl
                        value={qty}
                        max={row.items[0]?.stockLimit}
                        onMinus={() => updateQuantity(row.items[0].id, -1)}
                        onPlus={() => updateQuantity(row.items[0].id, +1)}
                        size="sm"
                      />
                      <div className="text-right">
                        <span className="text-sm font-semibold">{fmt(bundleTotal)}</span>
                        {bundleOriginal > bundleTotal && (
                          <span className="block text-xs text-gray-400 line-through">{fmt(bundleOriginal)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {giftItems.map((gift) => (
                <div key={`gift-${gift.productId}`} className="flex gap-4 border-b border-gray-100 px-6 py-5">
                  <div className="relative h-24 w-20 shrink-0">
                    <ImageWithFallback src={gift.image} alt={gift.name} fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <p className="mb-1 text-sm leading-tight font-semibold">{gift.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="border border-[#bbf7d0] bg-[#f0fdf4] px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-green-600 uppercase">
                          {lFreeGift}
                        </span>
                        <span className="text-xs text-gray-500">
                          {lQty} {gift.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end">
                      <div className="text-right">
                        <span className="text-sm font-semibold tracking-wide text-green-600 uppercase">{lFree}</span>
                        {gift.price > 0 && (
                          <span className="block text-xs text-gray-400 line-through">
                            {fmt(gift.price * gift.quantity)}
                          </span>
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
          <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-5">
            {/* Subtotal = sum of `item.price` (already sale price when
                the catalog / PDP overlay produced one). Line items above
                render the strike-through UX, so no redundant "Items
                discount" row here — that was the original math bug
                ("$31.5 − $3.5 = $35"). */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm tracking-wide text-gray-500">{lSubtotal}</span>
              <span className="text-base font-semibold">{fmt(subtotal)}</span>
            </div>
            {/* Skeleton for first preview — user sees SOMETHING is loading
                instead of a jumpy layout when the discount lines appear a
                moment later. Only fires when preview is truly pending
                (`previewLoading && !preview`). Subsequent refetches keep the
                old preview visible so numbers don't flash. */}
            {previewLoading && !preview ? (
              <>
                <div className="mb-2 flex items-center justify-between" aria-busy="true">
                  <div className="h-3 w-24 animate-pulse bg-gray-100" />
                  <div className="h-3 w-14 animate-pulse bg-gray-100" />
                </div>
                <div className="mb-4 flex items-center justify-between border-t border-gray-100 pt-2" aria-busy="true">
                  <div className="h-3.5 w-14 animate-pulse bg-gray-100" />
                  <div className="h-4 w-20 animate-pulse bg-gray-100" />
                </div>
              </>
            ) : (
              <>
                {personalDiscount - couponDiscount > 0 && (
                  <div className="mb-2 flex items-center justify-between text-sm text-(--sale)">
                    <span>{lLoyalty}</span>
                    <span className="font-semibold">−{fmt(personalDiscount - couponDiscount)}</span>
                  </div>
                )}
                {couponDiscount > 0 && couponCode && (
                  <div className="mb-2 flex items-center justify-between text-sm text-(--sale)">
                    <span>
                      {lPromo} ({couponCode})
                    </span>
                    <span className="font-semibold">−{fmt(couponDiscount)}</span>
                  </div>
                )}
                <div className="mb-4 flex items-center justify-between border-t border-gray-100 pt-2">
                  <span className="text-sm font-bold">{lTotal}</span>
                  <span className="text-base font-bold">{fmt(displayTotal)}</span>
                </div>
                {(personalDiscount > 0 || couponDiscount > 0) && preview && preview.totalDue !== subtotal && (
                  <p className="mb-3 text-[10px] text-gray-400">{lAppliedAtCheckout}</p>
                )}
              </>
            )}
            <p className="mb-4 text-xs text-gray-400">{lShippingNote}</p>
            {/* CTA buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  closeMiniCart();
                  router.push('/checkout/delivery');
                }}
                className="w-full bg-black py-4 text-sm font-bold tracking-[0.2em] text-white uppercase transition-colors duration-200 hover:bg-primary-women focus-visible:outline-none active:bg-primary-men"
              >
                {lCheckout}
              </button>
              <button
                onClick={() => {
                  closeMiniCart();
                  router.push('/cart');
                }}
                className="w-full border border-black py-3.5 text-sm font-semibold tracking-[0.2em] uppercase transition-colors duration-200 hover:bg-gray-50 focus-visible:outline-none active:bg-gray-100"
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
