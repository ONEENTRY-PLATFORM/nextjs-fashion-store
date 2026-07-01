'use client'
import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { CheckoutStepper } from '../components/CheckoutStepper';
import { useCart, type CartItem } from '../context/CartContext';
import { Tag, ShoppingBag, Trash2 } from 'lucide-react';
import { CartItemRow } from './cart/CartItemRow';
import { CartBundleRow } from './cart/CartBundleRow';

const CheckMark = () => <Image src="/icons/ui/check.svg" alt="" width={8} height={8} unoptimized />;

type RenderRow =
  | { kind: 'item'; item: CartItem }
  | { kind: 'bundle'; bundleId: string; items: CartItem[] };

import { ACCENT_WOMEN as ACCENT, SALE_COLOR } from '../constants/colors';
import { fmt } from '../utils/formatPrice';
import { CHECKOUT_COUPONS } from '../data/checkoutConfig';
import { CART_PAGE_LABELS as L } from '../data/cartLabels';
import { useT } from '../../lib/oneentry/labels/CheckoutLabelsContext';

export function CartPage() {
  const { items, removeItem, removeBundle, updateQuantity, updateSize, subtotal, discount, total } = useCart();
  const router = useRouter();

  const lSelectAll        = useT('checkout_cart', 'checkout_delivery_select_all',              L.selectAll);
  const lRemove           = useT('checkout_cart', 'checkout_delivery_remove',                  L.removeSelectedPrefix);
  const lOrderSummary     = useT('checkout_cart', 'checkout_delivery_order_summary',           L.orderSummary);
  const lSubtotal         = useT('checkout_cart', 'checkout_delivery_subtotal',                L.subtotal);
  const lDelivery         = useT('checkout_cart', 'checkout_delivery_delivery',                L.delivery);
  const lFree             = useT('checkout_cart', 'checkout_delivery_free',                    L.deliveryFree);
  const lTotal            = useT('checkout_cart', 'checkout_delivery_total',                   L.total);
  const lEarnPrefix       = useT('checkout_cart', 'checkout_delivery_warning_text1',           L.loyaltyEarnPrefix);
  const lEarnTemplate     = useT('checkout_cart', 'checkout_delivery_warning_text2',           L.loyaltyEarnTemplate);
  const lPromoCheckbox    = useT('checkout_cart', 'checkout_delivery_i_have_a_promo_code',     L.promoCheckboxLabel);
  const lPromoPlaceholder = useT('checkout_cart', 'checkout_delivery_enter_code',              L.promoPlaceholder);
  const lPromoApply       = useT('checkout_cart', 'checkout_delivery_enter_code_cta',          L.promoApplyButton);
  const lProceed          = useT('checkout_cart', 'checkout_delivery_proceed_to_checkout_cta', L.proceedToCheckout);
  const lTrustNote        = useT('checkout_cart', 'checkout_delivery_checkout_bottom_text',    L.trustNote);
  const lItemCount        = useT('checkout_cart', 'checkout_delivery_item_count',              L.itemPlural);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [promoChecked, setPromoChecked] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const rows = useMemo<RenderRow[]>(() => {
    const bundleMap = new Map<string, CartItem[]>();
    for (const item of items) {
      if (item.bundleId) {
        const arr = bundleMap.get(item.bundleId);
        if (arr) arr.push(item);
        else bundleMap.set(item.bundleId, [item]);
      }
    }
    const result: RenderRow[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (!item.bundleId) {
        result.push({ kind: 'item', item });
      } else if (!seen.has(item.bundleId)) {
        seen.add(item.bundleId);
        result.push({ kind: 'bundle', bundleId: item.bundleId, items: bundleMap.get(item.bundleId)! });
      }
    }
    return result;
  }, [items]);

  const nonBundleItems = useMemo(() => items.filter(i => !i.bundleId), [items]);
  const allSelected = selectedIds.size === nonBundleItems.length && nonBundleItems.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(nonBundleItems.map(i => i.id)));
  };

  const removeSelected = () => {
    selectedIds.forEach(id => removeItem(id));
    setSelectedIds(new Set());
  };

  const toggleWishlist = (id: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    const coupon = CHECKOUT_COUPONS[code];
    if (coupon) {
      setPromoDiscount(subtotal * coupon.pct / 100);
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoDiscount(0);
      setPromoApplied(false);
      setPromoError(L.promoInvalidError);
    }
  };

  const finalTotal = total - promoDiscount;

  return (
    <div
      className="min-h-screen bg-white font-[Inter,sans-serif]"
      style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}
    >
      <Header />

      <main id="main-content" className="max-w-screen-xl mx-auto px-4 lg:px-8 pb-20">
        {/* Stepper */}
        <div className="border-b border-[#e5e7eb]">
          <CheckoutStepper currentStep={0} />
        </div>

        {/* Page title */}
        <div className="py-6 border-b border-[#e5e7eb]">
          <h1 className="text-xl tracking-[0.15em] uppercase font-bold">
            {L.pageTitle}
            {mounted && (
              <span className="ml-3 text-sm text-gray-400 font-normal">
                ({items.length} {items.length === 1 ? L.itemSingular : L.itemPlural})
              </span>
            )}
          </h1>
        </div>

        {!mounted ? (
          /* Skeleton — shown before JS hydration */
          <div className="flex flex-col lg:flex-row gap-8 pt-8">
            <div className="flex-1 min-w-0">
              <div className="h-12 bg-accent animate-pulse mb-4" />
              <div className="flex flex-col border border-[#e5e7eb]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex gap-4 p-5 ${i < 2 ? 'border-b border-[#e5e7eb]' : ''}`}
                    style={{ '--delay': `${i * 80}ms` } as React.CSSProperties}
                  >
                    <div className="w-4 h-4 bg-accent animate-pulse flex-shrink-0 mt-1 [animation-delay:var(--delay)]" />
                    <div className="flex-shrink-0 bg-accent animate-pulse w-[110px] h-[140px] [animation-delay:var(--delay)]" />
                    <div className="flex-1 flex flex-col gap-2.5 pt-1">
                      <div className="h-3 bg-accent animate-pulse rounded w-1/4 [animation-delay:var(--delay)]" />
                      <div className="h-4 bg-accent animate-pulse rounded w-3/4 [animation-delay:var(--delay)]" />
                      <div className="h-3 bg-accent animate-pulse rounded w-2/5 [animation-delay:var(--delay)]" />
                      <div className="h-8 bg-accent animate-pulse rounded w-1/3 mt-1 [animation-delay:var(--delay)]" />
                      <div className="h-8 bg-accent animate-pulse rounded w-1/4 mt-auto [animation-delay:var(--delay)]" />
                    </div>
                    <div className="flex-shrink-0 w-14 flex flex-col gap-1 items-end">
                      <div className="h-5 bg-accent animate-pulse rounded w-full [animation-delay:var(--delay)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Order summary skeleton */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="h-6 bg-accent animate-pulse rounded mb-4 w-2/3" />
              <div className="flex flex-col gap-3 p-4 border border-[#e5e7eb]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3 bg-accent animate-pulse rounded w-1/3" />
                    <div className="h-3 bg-accent animate-pulse rounded w-1/4" />
                  </div>
                ))}
                <div className="h-px bg-accent mt-1" />
                <div className="h-10 bg-accent animate-pulse rounded mt-1" />
              </div>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <ShoppingBag size={64} strokeWidth={1} className="text-gray-300" />
            <p className="text-gray-400 tracking-wide text-sm">{L.emptyTitle}</p>
            <button
              onClick={() => router.push(L.emptyCtaHref)}
              className="px-10 py-4 text-white text-xs tracking-[0.2em] uppercase focus-visible:outline-none bg-black rounded-none"
            >
              {L.emptyCta}
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 pt-8">
            {/* ── Left: Item List ── */}
            <div className="flex-1 min-w-0">
              {/* Bulk controls */}
              <div className="flex items-center justify-between px-4 py-3 mb-4 border border-[#e5e7eb] bg-[#fafafa]">
                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <span
                    className={`w-4 h-4 flex items-center justify-center flex-shrink-0 rounded-none border-[1.5px] ${
                      allSelected ? 'border-black bg-black' : 'border-[#c8c8c8] bg-white'
                    }`}
                    onClick={toggleSelectAll}
                  >
                    {allSelected && (
                      <CheckMark />
                    )}
                  </span>
                  <span className="text-xs tracking-wide font-medium">{lSelectAll}</span>
                </label>
                {selectedIds.size > 0 && (
                  <button
                    onClick={removeSelected}
                    className="flex items-center gap-1.5 text-xs focus-visible:outline-none hover:opacity-70 transition-opacity text-[var(--sale)]"
                  >
                    <Trash2 size={13} />
                    {lRemove} ({selectedIds.size})
                  </button>
                )}
              </div>

              {/* Items */}
              <div className="flex flex-col border border-[#e5e7eb]">
                {rows.map((row, rowIdx) => {
                  const isLast = rowIdx === rows.length - 1;
                  if (row.kind === 'item') {
                    return (
                      <CartItemRow
                        key={row.item.id}
                        item={row.item}
                        isLast={isLast}
                        isSelected={selectedIds.has(row.item.id)}
                        inWishlist={wishlist.has(row.item.id)}
                        onToggleSelect={() => toggleSelect(row.item.id)}
                        onToggleWishlist={() => toggleWishlist(row.item.id)}
                        onUpdateSize={(s) => updateSize(row.item.id, s)}
                        onUpdateQuantity={(d) => updateQuantity(row.item.id, d)}
                        onRemove={() => removeItem(row.item.id)}
                      />
                    );
                  }
                  return (
                    <CartBundleRow
                      key={row.bundleId}
                      bundleId={row.bundleId}
                      items={row.items}
                      isLast={isLast}
                      onUpdateQuantity={updateQuantity}
                      onRemove={() => removeBundle(row.bundleId)}
                    />
                  );
                })}
              </div>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="lg:w-80 xl:w-96 flex-shrink-0">
              <div className="sticky top-32 border border-[#e5e7eb]">
                <div className="px-6 py-5 border-b border-[#e5e7eb]">
                  <h2 className="text-sm tracking-[0.15em] uppercase font-semibold">
                    {lOrderSummary}
                  </h2>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Price breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{lSubtotal} ({items.length} {lItemCount})</span>
                      <span className="font-medium">{fmt(subtotal + discount)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-[var(--sale)]">
                        <span>{L.itemsDiscount}</span>
                        <span className="font-semibold">−{fmt(discount)}</span>
                      </div>
                    )}
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-sm text-[var(--sale)]">
                        <span>{L.promo} ({promoCode.trim().toUpperCase()})</span>
                        <span className="font-semibold">−{fmt(promoDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{lDelivery}</span>
                      <span className="text-green-600 font-semibold">{lFree}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#e5e7eb]" />

                  {/* Total */}
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm tracking-wide uppercase font-bold">{lTotal}</span>
                    <span className="text-xl font-semibold">{fmt(finalTotal)}</span>
                  </div>

                  {/* Loyalty bonus */}
                  <div className="flex items-center gap-2 px-3 py-2.5 text-xs bg-[#fff8f8] border border-[var(--accent)]">
                    <span className="text-[var(--accent)]">★</span>
                    <span className="text-[#555]">
                      {lEarnPrefix} <strong>{Math.floor(finalTotal * 10)} {L.loyaltyEarnSuffix}</strong> {lEarnTemplate}
                    </span>
                  </div>

                  {/* Promo code */}
                  <div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer mb-3">
                      <span
                        className={`w-4 h-4 flex items-center justify-center flex-shrink-0 rounded-none border-[1.5px] ${
                          promoChecked ? 'border-black bg-black' : 'border-[#c8c8c8] bg-white'
                        }`}
                        onClick={() => setPromoChecked(p => !p)}
                      >
                        {promoChecked && <CheckMark />}
                      </span>
                      <Tag size={12} className="text-gray-500" />
                      <span className="font-medium">{lPromoCheckbox}</span>
                    </label>

                    {promoChecked && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                          placeholder={lPromoPlaceholder}
                          className="flex-1 px-3 py-2 text-xs outline-none border border-[#d1d5db] rounded-md"
                          onKeyDown={e => e.key === 'Enter' && applyPromo()}
                        />
                        <button
                          onClick={applyPromo}
                          className="px-4 py-2 text-xs tracking-wider uppercase text-white focus-visible:outline-none bg-black rounded-md font-semibold"
                        >
                          {lPromoApply}
                        </button>
                      </div>
                    )}
                    {promoApplied && (
                      <p className="text-xs mt-1.5 text-green-600">
                        {L.promoAppliedPrefix} — {CHECKOUT_COUPONS[promoCode.trim().toUpperCase()]?.label ?? L.promoAppliedFallback}!
                      </p>
                    )}
                    {promoError && (
                      <p className="text-xs mt-1.5 text-[var(--sale)]" role="alert">
                        {promoError}
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => router.push('/checkout/delivery')}
                    className="w-full py-4 text-sm tracking-[0.2em] uppercase text-white focus-visible:outline-none hover:opacity-90 transition-opacity bg-black rounded-lg font-bold"
                  >
                    {lProceed}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    {lTrustNote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}