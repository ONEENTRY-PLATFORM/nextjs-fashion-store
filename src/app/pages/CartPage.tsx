'use client';
import { ShoppingBag, Tag, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

import { CheckoutStepper } from '@/app/components/checkout/CheckoutStepper';
import { type CartItem, useCart } from '@/app/context/CartContext';
import { getCmsProductId } from '@/app/data/cms-product-id-map';
import { getProductsByIdsAction } from '@/lib/oneentry/catalog/products-action';

import { CartBundleRow } from './cart/CartBundleRow';
import { CartItemRow } from './cart/CartItemRow';

const CheckMark = () => <Image src="/icons/ui/check.svg" alt="" width={8} height={8} unoptimized />;

type RenderRow = { kind: 'item'; item: CartItem } | { kind: 'bundle'; bundleId: string; items: CartItem[] };

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { ACCENT_WOMEN as ACCENT, SALE_COLOR } from '@/app/constants/colors';
import { CART_PAGE_LABELS } from '@/app/data/cartLabels';
import { useMounted } from '@/app/hooks/useMounted';
import { fmt } from '@/app/utils/formatPrice';
import { useRouter } from '@/lib/i18n/navigation';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

export function CartPage({ pageBlocks }: { pageBlocks?: PageBlock[] } = {}) {
  const L = useDict('checkout_cart_page_', CART_PAGE_LABELS);
  const {
    items,
    removeItem,
    removeBundle,
    updateQuantity,
    updateSize,
    subtotal,
    total,
    personalDiscount,
    totalDue,
    couponCode,
    couponDiscount,
    couponError,
    applyCoupon,
    removeCoupon,
    preview,
    previewLoading,
    giftItems,
  } = useCart();
  const router = useRouter();

  const lSelectAll = useT('checkout_delivery_select_all', L.selectAll);
  const lRemove = useT('checkout_delivery_remove', L.removeSelectedPrefix);
  const lOrderSummary = useT('checkout_delivery_order_summary', L.orderSummary);
  const lSubtotal = useT('checkout_delivery_subtotal', L.subtotal);
  const lDelivery = useT('checkout_delivery_delivery', L.delivery);
  const lFree = useT('checkout_delivery_free', L.deliveryFree);
  const lTotal = useT('checkout_delivery_total', L.total);
  const lEarnPrefix = useT('checkout_delivery_warning_text1', L.loyaltyEarnPrefix);
  const lEarnTemplate = useT('checkout_delivery_warning_text2', L.loyaltyEarnTemplate);
  const lPromoCheckbox = useT('checkout_delivery_i_have_a_promo_code', L.promoCheckboxLabel);
  const lFreeGift = useT('checkout_cart_free_gift', L.freeGift);
  const lQty = useT('checkout_cart_qty_prefix', L.qtyPrefix);
  const lGiftFree = useT('checkout_cart_gift_free', L.giftFree);
  const lLoyaltyDiscount = useT('checkout_cart_loyalty_discount', L.loyaltyDiscount);
  const lPromoRemove = useT('checkout_cart_promo_remove', L.promoRemove);
  const lPromoPlaceholder = useT('checkout_delivery_enter_code', L.promoPlaceholder);
  const lPromoApply = useT('checkout_delivery_enter_code_cta', L.promoApplyButton);
  const lProceed = useT('checkout_delivery_proceed_to_checkout_cta', L.proceedToCheckout);
  const lTrustNote = useT('checkout_delivery_checkout_bottom_text', L.trustNote);
  const lItemCount = useT('checkout_delivery_item_count', L.itemPlural);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Promo section opens by default if a coupon is already applied on mount
  // (user navigated back from checkout with an applied code).
  const [promoChecked, setPromoChecked] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const mounted = useMounted();
  // Per-item real sizes loaded from OE. Keyed by cart item id. The fetcher
  // only queries ids that haven't been resolved yet, so navigating within the
  // cart won't re-fetch every time.
  const [sizesById, setSizesById] = useState<Record<string, string[]>>({});
  // Seed the promo input from the coupon already applied to the cart, once.
  // Done during render so the field is filled on the first paint instead of
  // flashing empty (and so it is not a synchronous `setState` in an effect).
  if (couponCode && !promoChecked) {
    setPromoChecked(true);
    setPromoInput(couponCode);
  }

  // Load real product sizes from OE for each cart item so the Size dropdown
  // renders the actual variants (e.g. a jewelry item shows just "One",
  // not the hardcoded XS/S/M/L/XL/XXL). We fetch by the CMS product id
  // (mapping ui.id → cmsId) and store the result under the cart item id
  // that the row will look up.
  useEffect(() => {
    // Items whose id doesn't map to an OE product are filtered out up front
    // rather than parked in `sizesById` as empty markers — that write was a
    // synchronous `setState` inside the effect purely to stop it re-running.
    const idPairs = items.flatMap((it) => {
      if (it.id in sizesById) return [];
      const cmsId = getCmsProductId(it.id);
      return cmsId !== null ? [{ localId: it.id, cmsId }] : [];
    });
    if (idPairs.length === 0) return;
    const cmsIds = idPairs.map((p) => p.cmsId);
    let cancelled = false;
    void getProductsByIdsAction(cmsIds).then((products) => {
      if (cancelled) return;
      // Adapter returns products keyed by ui.id (playgroundId ?? String(cmsId)),
      // which is the same value we stored as pair.localId, so match on that.
      const byLocalId = new Map(products.map((p) => [p.id, p.sizes ?? []]));
      setSizesById((prev) => {
        const next = { ...prev };
        for (const pair of idPairs) {
          next[pair.localId] = byLocalId.get(pair.localId) ?? [];
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
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
        result.push({ kind: 'bundle', bundleId: item.bundleId, items: bundleMap.get(item.bundleId) ?? [] });
      }
    }
    return result;
  }, [items]);

  const nonBundleItems = useMemo(() => items.filter((i) => !i.bundleId), [items]);
  const allSelected = selectedIds.size === nonBundleItems.length && nonBundleItems.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(nonBundleItems.map((i) => i.id)));
  };

  const removeSelected = () => {
    selectedIds.forEach((id) => removeItem(id));
    setSelectedIds(new Set());
  };

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      className="flex-1 bg-white font-sans"
      style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}
    >
      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        {/* Stepper */}
        <div className="border-b border-[#e5e7eb]">
          <CheckoutStepper currentStep={0} />
        </div>

        {/* Page title */}
        <div className="border-b border-[#e5e7eb] py-6">
          <h1 className="text-xl font-bold tracking-[0.15em] uppercase">
            {L.pageTitle}
            {mounted && (
              <span className="ml-3 text-sm font-normal text-gray-400">
                ({items.length} {items.length === 1 ? L.itemSingular : L.itemPlural})
              </span>
            )}
          </h1>
        </div>

        {!mounted ? (
          /* Skeleton — shown before JS hydration */
          <div className="flex flex-col gap-8 pt-8 lg:flex-row">
            <div className="min-w-0 flex-1">
              <div className="mb-4 h-12 animate-pulse bg-gray-100" />
              <div className="flex flex-col border border-[#e5e7eb]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex gap-4 p-5 ${i < 2 ? 'border-b border-[#e5e7eb]' : ''}`}
                    style={{ '--delay': `${i * 80}ms` } as React.CSSProperties}
                  >
                    <div className="mt-1 size-4 shrink-0 animate-pulse bg-gray-100 [animation-delay:var(--delay)]" />
                    <div className="h-35 w-27.5 shrink-0 animate-pulse bg-gray-100 [animation-delay:var(--delay)]" />
                    <div className="flex flex-1 flex-col gap-2.5 pt-1">
                      <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100 [animation-delay:var(--delay)]" />
                      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 [animation-delay:var(--delay)]" />
                      <div className="h-3 w-2/5 animate-pulse rounded bg-gray-100 [animation-delay:var(--delay)]" />
                      <div className="mt-1 h-8 w-1/3 animate-pulse rounded bg-gray-100 [animation-delay:var(--delay)]" />
                      <div className="mt-auto h-8 w-1/4 animate-pulse rounded bg-gray-100 [animation-delay:var(--delay)]" />
                    </div>
                    <div className="flex w-14 shrink-0 flex-col items-end gap-1">
                      <div className="h-5 w-full animate-pulse rounded bg-gray-100 [animation-delay:var(--delay)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Order summary skeleton */}
            <div className="shrink-0 lg:w-80">
              <div className="mb-4 h-6 w-2/3 animate-pulse rounded bg-gray-100" />
              <div className="flex flex-col gap-3 border border-[#e5e7eb] p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100" />
                  </div>
                ))}
                <div className="mt-1 h-px bg-gray-200" />
                <div className="mt-1 h-10 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-6 py-24">
            <ShoppingBag size={64} strokeWidth={1} className="text-gray-300" />
            <p className="text-sm tracking-wide text-gray-400">{L.emptyTitle}</p>
            <button
              onClick={() => router.push(L.emptyCtaHref)}
              className="rounded-none bg-black px-10 py-4 text-xs tracking-[0.2em] text-white uppercase focus-visible:outline-none"
            >
              {L.emptyCta}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8 pt-8 lg:flex-row">
            {/* ── Left: Item List ── */}
            <div className="min-w-0 flex-1">
              {/* Bulk controls */}
              <div className="mb-4 flex items-center justify-between border border-[#e5e7eb] bg-[#fafafa] px-4 py-3">
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded-none border-[1.5px] ${
                      allSelected ? 'border-black bg-black' : 'border-[#c8c8c8] bg-white'
                    }`}
                    onClick={toggleSelectAll}
                  >
                    {allSelected && <CheckMark />}
                  </span>
                  <span className="text-xs font-medium tracking-wide">{lSelectAll}</span>
                </label>
                {selectedIds.size > 0 && (
                  <button
                    onClick={removeSelected}
                    className="flex items-center gap-1.5 text-xs text-(--sale) transition-opacity hover:opacity-70 focus-visible:outline-none"
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
                    <div className="relative h-20 w-16 shrink-0 sm:h-24 sm:w-20">
                      <Image src={gift.image} alt={gift.name} fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{gift.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="border border-[#bbf7d0] bg-[#f0fdf4] px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-green-600 uppercase">
                          {lFreeGift}
                        </span>
                        <span className="text-xs text-gray-500">
                          {lQty} {gift.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tracking-wide text-green-600 uppercase">{lGiftFree}</p>
                      {gift.price > 0 && (
                        <p className="mt-0.5 text-xs text-gray-400 line-through">{fmt(gift.price * gift.quantity)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="shrink-0 lg:w-80 xl:w-96">
              <div className="sticky top-32 border border-[#e5e7eb]">
                <div className="border-b border-[#e5e7eb] px-6 py-5">
                  <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">{lOrderSummary}</h2>
                </div>

                <div className="space-y-4 px-6 py-5">
                  {/* Price breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {lSubtotal} ({items.length} {lItemCount})
                      </span>
                      <span className="font-medium">{fmt(subtotal)}</span>
                    </div>
                    {/* Preview skeleton — only on the very first load. Once
                        `preview` is set, refetches don't flash: we keep the
                        old numbers visible. */}
                    {previewLoading && !preview ? (
                      <div className="flex justify-between text-sm" aria-busy="true">
                        <div className="h-3.5 w-32 animate-pulse bg-gray-100" />
                        <div className="h-3.5 w-16 animate-pulse bg-gray-100" />
                      </div>
                    ) : (
                      <>
                        {personalDiscount - couponDiscount > 0 && (
                          <div className="flex justify-between text-sm text-(--sale)">
                            <span>{lLoyaltyDiscount}</span>
                            <span className="font-semibold">−{fmt(personalDiscount - couponDiscount)}</span>
                          </div>
                        )}
                        {couponDiscount > 0 && couponCode && (
                          <div className="flex justify-between text-sm text-(--sale)">
                            <span>
                              {L.promo} ({couponCode})
                            </span>
                            <span className="font-semibold">−{fmt(couponDiscount)}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{lDelivery}</span>
                      <span className="font-semibold text-green-600">{lFree}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#e5e7eb]" />

                  {/* Total — skeleton on first preview load so the shopper
                      doesn't see a subtotal-shaped "Total" that jumps down
                      the moment discounts arrive. */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold tracking-wide uppercase">{lTotal}</span>
                    {previewLoading && !preview ? (
                      <div className="h-6 w-24 animate-pulse bg-gray-100" aria-busy="true" />
                    ) : (
                      <span className="text-xl font-semibold">{fmt(finalTotal)}</span>
                    )}
                  </div>

                  {/* Loyalty bonus */}
                  <div className="flex items-center gap-2 border border-accent bg-[#fff8f8] px-3 py-2.5 text-xs">
                    <span className="text-accent">★</span>
                    <span className="text-[#555]">
                      {lEarnPrefix}{' '}
                      <strong>
                        {Math.floor(finalTotal * 10)} {L.loyaltyEarnSuffix}
                      </strong>{' '}
                      {lEarnTemplate}
                    </span>
                  </div>

                  {/* Promo code */}
                  <div>
                    <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs">
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded-none border-[1.5px] ${
                          promoChecked ? 'border-black bg-black' : 'border-[#c8c8c8] bg-white'
                        }`}
                        onClick={() => setPromoChecked((p) => !p)}
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
                          onChange={(e) => setPromoInput(e.target.value)}
                          placeholder={lPromoPlaceholder}
                          disabled={promoBusy}
                          className="flex-1 rounded-md border border-[#d1d5db] px-3 py-2 text-xs outline-none disabled:opacity-60"
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={promoBusy}
                          className="rounded-md bg-black px-4 py-2 text-xs font-semibold tracking-wider text-white uppercase focus-visible:outline-none disabled:opacity-60"
                        >
                          {promoBusy ? '…' : lPromoApply}
                        </button>
                      </div>
                    )}
                    {couponCode && (
                      <div className="flex items-center justify-between gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
                        <span className="text-xs text-green-700">
                          {L.promoAppliedPrefix} — <strong>{couponCode}</strong>
                        </span>
                        <button
                          onClick={handleRemovePromo}
                          className="text-[10px] tracking-wider text-gray-500 uppercase hover:text-black focus-visible:outline-none"
                        >
                          {lPromoRemove}
                        </button>
                      </div>
                    )}
                    {couponError && !couponCode && (
                      <p className="mt-1.5 text-xs text-(--sale)" role="alert">
                        {couponError}
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => router.push('/checkout/delivery')}
                    className="w-full rounded-lg bg-black py-4 text-sm font-bold tracking-[0.2em] text-white uppercase transition-opacity hover:opacity-90 focus-visible:outline-none"
                  >
                    {lProceed}
                  </button>

                  <p className="text-center text-xs text-gray-400">{lTrustNote}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* OE-attached blocks for the `cart` page — rendered at the bottom
          below the cart contents. Empty → nothing renders. */}
      {pageBlocks && pageBlocks.length > 0 && <PageBlocksRenderer blocks={pageBlocks} />}
    </div>
  );
}
