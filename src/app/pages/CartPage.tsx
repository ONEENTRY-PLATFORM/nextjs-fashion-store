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
import { getProductsByIdsAction } from '../../lib/oneentry/catalog/products-action';
import { getCmsProductId } from '../data/cms-product-id-map';

const CheckMark = () => <Image src="/icons/ui/check.svg" alt="" width={8} height={8} unoptimized />;

type RenderRow =
  | { kind: 'item'; item: CartItem }
  | { kind: 'bundle'; bundleId: string; items: CartItem[] };

import { ACCENT_WOMEN as ACCENT, SALE_COLOR } from '../constants/colors';
import { fmt } from '../utils/formatPrice';
import { CART_PAGE_LABELS as L } from '../data/cartLabels';
import { useT } from '../../lib/oneentry/labels/CheckoutLabelsContext';
import { PageBlocksRenderer } from '../components/PageBlocksRenderer';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

export function CartPage({ pageBlocks }: { pageBlocks?: PageBlock[] } = {}) {
  const {
    items, removeItem, removeBundle, updateQuantity, updateSize,
    subtotal, discount, total, personalDiscount, totalDue,
    couponCode, couponDiscount, couponError, applyCoupon, removeCoupon,
    preview, previewLoading, giftItems,
  } = useCart();
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
  // Promo section opens by default if a coupon is already applied on mount
  // (user navigated back from checkout with an applied code).
  const [promoChecked, setPromoChecked] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  // Per-item real sizes loaded from OE. Keyed by cart item id. The fetcher
  // only queries ids that haven't been resolved yet, so navigating within the
  // cart won't re-fetch every time.
  const [sizesById, setSizesById] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (couponCode && !promoChecked) {
      setPromoChecked(true);
      setPromoInput(couponCode);
    }
  }, [couponCode, promoChecked]);

  useEffect(() => { setMounted(true); }, []);

  // Load real product sizes from OE for each cart item so the Size dropdown
  // renders the actual variants (e.g. a jewelry item shows just "One",
  // not the hardcoded XS/S/M/L/XL/XXL). We fetch by the CMS product id
  // (mapping ui.id → cmsId) and store the result under the cart item id
  // that the row will look up.
  useEffect(() => {
    const unresolved = items.filter(i => !(i.id in sizesById));
    if (unresolved.length === 0) return;
    const idPairs = unresolved.flatMap((it) => {
      const cmsId = getCmsProductId(it.id);
      return cmsId !== null ? [{ localId: it.id, cmsId }] : [];
    });
    if (idPairs.length === 0) {
      // Nothing mappable — mark as empty so we don't loop.
      setSizesById(prev => {
        const next = { ...prev };
        for (const it of unresolved) if (!(it.id in next)) next[it.id] = [];
        return next;
      });
      return;
    }
    const cmsIds = idPairs.map(p => p.cmsId);
    let cancelled = false;
    void getProductsByIdsAction(cmsIds).then((products) => {
      if (cancelled) return;
      // Adapter returns products keyed by ui.id (playgroundId ?? String(cmsId)),
      // which is the same value we stored as pair.localId, so match on that.
      const byLocalId = new Map(products.map(p => [p.id, p.sizes ?? []]));
      setSizesById(prev => {
        const next = { ...prev };
        for (const pair of idPairs) {
          next[pair.localId] = byLocalId.get(pair.localId) ?? [];
        }
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [items, sizesById]);

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

  const handleApplyPromo = async () => {
    if (promoBusy) return;
    setPromoBusy(true);
    await applyCoupon(promoInput);
    setPromoBusy(false);
  };
  const handleRemovePromo = () => {
    removeCoupon();
    setPromoInput('');
  };

  // Client sale price is baked into `item.price` (catalog / PDP overlay),
  // so the client `total` already reflects the sale. Prefer OE's
  // `totalDue` when OE actually knocked something extra off — a loyalty
  // tier discount, a valid coupon, OR the shopper burned some bonus
  // points. Any of those three land honestly on the visible total.
  const bonusBurned = (preview?.bonusApplied ?? 0) > 0;
  const finalTotal = personalDiscount > 0 || couponDiscount > 0 || bonusBurned ? totalDue : total;

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
              <div className="h-12 bg-gray-100 animate-pulse mb-4" />
              <div className="flex flex-col border border-[#e5e7eb]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex gap-4 p-5 ${i < 2 ? 'border-b border-[#e5e7eb]' : ''}`}
                    style={{ '--delay': `${i * 80}ms` } as React.CSSProperties}
                  >
                    <div className="w-4 h-4 bg-gray-100 animate-pulse flex-shrink-0 mt-1 [animation-delay:var(--delay)]" />
                    <div className="flex-shrink-0 bg-gray-100 animate-pulse w-[110px] h-[140px] [animation-delay:var(--delay)]" />
                    <div className="flex-1 flex flex-col gap-2.5 pt-1">
                      <div className="h-3 bg-gray-100 animate-pulse rounded w-1/4 [animation-delay:var(--delay)]" />
                      <div className="h-4 bg-gray-100 animate-pulse rounded w-3/4 [animation-delay:var(--delay)]" />
                      <div className="h-3 bg-gray-100 animate-pulse rounded w-2/5 [animation-delay:var(--delay)]" />
                      <div className="h-8 bg-gray-100 animate-pulse rounded w-1/3 mt-1 [animation-delay:var(--delay)]" />
                      <div className="h-8 bg-gray-100 animate-pulse rounded w-1/4 mt-auto [animation-delay:var(--delay)]" />
                    </div>
                    <div className="flex-shrink-0 w-14 flex flex-col gap-1 items-end">
                      <div className="h-5 bg-gray-100 animate-pulse rounded w-full [animation-delay:var(--delay)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Order summary skeleton */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="h-6 bg-gray-100 animate-pulse rounded mb-4 w-2/3" />
              <div className="flex flex-col gap-3 p-4 border border-[#e5e7eb]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3 bg-gray-100 animate-pulse rounded w-1/3" />
                    <div className="h-3 bg-gray-100 animate-pulse rounded w-1/4" />
                  </div>
                ))}
                <div className="h-px bg-gray-200 mt-1" />
                <div className="h-10 bg-gray-100 animate-pulse rounded mt-1" />
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
                  const isLast = rowIdx === rows.length - 1 && giftItems.length === 0;
                  if (row.kind === 'item') {
                    return (
                      <CartItemRow
                        key={row.item.id}
                        item={row.item}
                        isLast={isLast}
                        isSelected={selectedIds.has(row.item.id)}
                        inWishlist={wishlist.has(row.item.id)}
                        availableSizes={sizesById[row.item.id]}
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
                {giftItems.map((gift, idx) => (
                  <div
                    key={`gift-${gift.productId}`}
                    className={`flex items-center gap-4 p-4 sm:p-5 ${idx < giftItems.length - 1 ? 'border-b border-[#e5e7eb]' : ''}`}
                  >
                    <div className="relative flex-shrink-0 w-16 h-20 sm:w-20 sm:h-24">
                      <Image src={gift.image} alt={gift.name} fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{gift.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] tracking-widest uppercase font-bold text-green-600 bg-[#f0fdf4] border border-[#bbf7d0] px-1.5 py-0.5">
                          Free gift
                        </span>
                        <span className="text-xs text-gray-500">Qty {gift.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">Free</p>
                      {gift.price > 0 && (
                        <p className="text-xs text-gray-400 line-through mt-0.5">{fmt(gift.price * gift.quantity)}</p>
                      )}
                    </div>
                  </div>
                ))}
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
                      <span className="font-medium">{fmt(subtotal)}</span>
                    </div>
                    {/* Preview skeleton — only on the very first load. Once
                        `preview` is set, refetches don't flash: we keep the
                        old numbers visible. */}
                    {previewLoading && !preview ? (
                      <div className="flex justify-between text-sm" aria-busy="true">
                        <div className="h-3.5 w-32 bg-gray-100 animate-pulse" />
                        <div className="h-3.5 w-16 bg-gray-100 animate-pulse" />
                      </div>
                    ) : (
                      <>
                        {personalDiscount - couponDiscount > 0 && (
                          <div className="flex justify-between text-sm text-[var(--sale)]">
                            <span>Loyalty discount</span>
                            <span className="font-semibold">−{fmt(personalDiscount - couponDiscount)}</span>
                          </div>
                        )}
                        {couponDiscount > 0 && couponCode && (
                          <div className="flex justify-between text-sm text-[var(--sale)]">
                            <span>{L.promo} ({couponCode})</span>
                            <span className="font-semibold">−{fmt(couponDiscount)}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{lDelivery}</span>
                      <span className="text-green-600 font-semibold">{lFree}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#e5e7eb]" />

                  {/* Total — skeleton on first preview load so the shopper
                      doesn't see a subtotal-shaped "Total" that jumps down
                      the moment discounts arrive. */}
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm tracking-wide uppercase font-bold">{lTotal}</span>
                    {previewLoading && !preview ? (
                      <div className="h-6 w-24 bg-gray-100 animate-pulse" aria-busy="true" />
                    ) : (
                      <span className="text-xl font-semibold">{fmt(finalTotal)}</span>
                    )}
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

                    {promoChecked && !couponCode && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={e => setPromoInput(e.target.value)}
                          placeholder={lPromoPlaceholder}
                          disabled={promoBusy}
                          className="flex-1 px-3 py-2 text-xs outline-none border border-[#d1d5db] rounded-md disabled:opacity-60"
                          onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={promoBusy}
                          className="px-4 py-2 text-xs tracking-wider uppercase text-white focus-visible:outline-none bg-black rounded-md font-semibold disabled:opacity-60"
                        >
                          {promoBusy ? '…' : lPromoApply}
                        </button>
                      </div>
                    )}
                    {couponCode && (
                      <div className="flex items-center justify-between gap-2 px-3 py-2 border border-green-200 bg-green-50 rounded-md">
                        <span className="text-xs text-green-700">
                          {L.promoAppliedPrefix} — <strong>{couponCode}</strong>
                        </span>
                        <button
                          onClick={handleRemovePromo}
                          className="text-[10px] tracking-wider uppercase text-gray-500 hover:text-black focus-visible:outline-none"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {couponError && !couponCode && (
                      <p className="text-xs mt-1.5 text-[var(--sale)]" role="alert">
                        {couponError}
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

      {/* OE-attached blocks for the `cart` page — rendered at the bottom
          below the cart contents. Empty → nothing renders. */}
      {pageBlocks && pageBlocks.length > 0 && (
        <PageBlocksRenderer blocks={pageBlocks} />
      )}

      <Footer />
    </div>
  );
}