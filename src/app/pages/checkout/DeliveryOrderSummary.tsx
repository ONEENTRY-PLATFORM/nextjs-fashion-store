'use client';
import { CheckCircle, ChevronDown, Tag, X } from 'lucide-react';
import Image from 'next/image';

import { SALE_COLOR } from '@/app/constants/colors';
import { type GiftCartItem, useCart } from '@/app/context/CartContext';
import { fmt } from '@/app/utils/formatPrice';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

export const DELIVERY_SUMMARY_LABELS = {
  heading: 'Order Summary',
  qtyPrefix: 'Qty',
  sizePrefix: 'Size',
  promoCodeLabel: 'Promo Code',
  promoPlaceholder: 'Enter promo code',
  promoApply: 'Apply',
  promoInvalid: 'Invalid or expired code',
  discount: 'Discount',
  promo: 'Promo',
  delivery: 'Delivery',
  deliveryFree: 'Free',
  total: 'Total',
  freeGift: 'Free gift',
  giftFree: 'Free',
  loyaltyDiscount: 'Loyalty discount',
} as const;

interface Props {
  summaryOpen: boolean;
  setSummaryOpen: (fn: (o: boolean) => boolean) => void;
  /** Currently applied coupon code (uppercased) from CartContext, `null` when none. */
  appliedCoupon: string | null;
  couponInput: string;
  setCouponInput: (v: string) => void;
  /** Derived: `success` when a code is applied, `error` when applyCoupon returned an error. */
  couponStatus: 'idle' | 'success' | 'error';
  /** Human-readable error from OE (`Add $X more to unlock …`, etc.) — shown under the input. */
  couponError: string | null;
  couponLoading: boolean;
  handleApplyCoupon: () => void;
  handleRemoveCoupon: () => void;
  /** Amount OE deducted for the coupon (from `previewOrder.couponDiscountAmount`). */
  couponDiscount: number;
  /** Loyalty tier discount, EXCLUDING the coupon slice (parent should pass `discountAmount - couponDiscountAmount`). */
  personalDiscount: number;
  finalTotal: number;
  /** `previewOrder` is in flight and we don't yet know the discounts — show skeleton. */
  previewLoading: boolean;
  /** `true` once the first preview has arrived; suppresses skeleton for subsequent refetches. */
  hasPreview: boolean;
  /**
   * Free gifts OE appended to the order (hydrated with product name/image).
   *  Passed from the parent so an in-session Apply Coupon fires the parent's
   *  `useCart` instance while this component reads its own — otherwise the
   *  gift wouldn't appear until the shopper reloads and both instances re-init
   *  from the persisted coupon.
   */
  giftItems: GiftCartItem[];
}

export function DeliveryOrderSummary({
  summaryOpen,
  setSummaryOpen,
  appliedCoupon,
  couponInput,
  setCouponInput,
  couponStatus,
  couponError,
  couponLoading,
  handleApplyCoupon,
  handleRemoveCoupon,
  couponDiscount,
  personalDiscount,
  finalTotal,
  previewLoading,
  hasPreview,
  giftItems,
}: Props) {
  const L = useDict('checkout_delivery_summary_', DELIVERY_SUMMARY_LABELS);
  const { items } = useCart();
  const lHeading = useT('checkout_delivery_order_summary_title', L.heading);
  const lPromoLabel = useT('checkout_delivery_promo_code', L.promoCodeLabel);
  const lPromoPh = useT('checkout_delivery_enter_promo_code', L.promoPlaceholder);
  const lPromoApply = useT('checkout_delivery_promocode_cta', L.promoApply);
  const lDelivery = useT('checkout_delivery_summary_delivery', L.delivery);
  const lFree = useT('checkout_delivery_order_summary_delivery_free', L.deliveryFree);
  const lTotal = useT('checkout_delivery_order_summary_total', L.total);
  const lFreeGift = useT('checkout_delivery_free_gift', L.freeGift);
  const lGiftFree = useT('checkout_delivery_gift_free', L.giftFree);
  const lLoyalty = useT('checkout_delivery_loyalty_discount', L.loyaltyDiscount);

  return (
    <div className="shrink-0 lg:w-80 xl:w-96" style={{ '--sale': SALE_COLOR } as React.CSSProperties}>
      <div className="sticky top-32 border border-[#e5e7eb]">
        {/* Mobile toggle */}
        <button
          className={`flex w-full items-center justify-between px-6 py-4 focus-visible:outline-none lg:cursor-default ${
            summaryOpen ? 'border-b border-[#e5e7eb]' : ''
          }`}
          onClick={() => setSummaryOpen((o) => !o)}
          aria-expanded={summaryOpen}
        >
          <h2 className="text-sm font-bold tracking-[0.15em] uppercase">{lHeading}</h2>
          <ChevronDown
            size={14}
            className={`transition-transform lg:hidden ${summaryOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>

        <div className="space-y-3 px-6 py-5">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="relative h-14 w-12 shrink-0">
                <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug font-medium">{item.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <p className="text-xs text-gray-400">
                    {L.qtyPrefix} {item.quantity} · {L.sizePrefix} {item.size}
                  </p>
                  {item.color && (
                    <>
                      <span className="text-xs text-gray-400">·</span>
                      <span
                        className="inline-block size-3 shrink-0 rounded-full border border-[#e5e7eb]"
                        style={{ backgroundColor: item.color }}
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold">{fmt(item.price * item.quantity)}</p>
                {item.originalPrice && item.originalPrice > item.price && (
                  <p className="text-xs text-gray-400 line-through">{fmt(item.originalPrice * item.quantity)}</p>
                )}
              </div>
            </div>
          ))}

          {giftItems.map((gift) => (
            <div key={`gift-${gift.productId}`} className="flex gap-3">
              <div className="relative h-14 w-12 shrink-0">
                <Image src={gift.image} alt={gift.name} fill sizes="48px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug font-medium">{gift.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="border border-[#bbf7d0] bg-[#f0fdf4] px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-green-600 uppercase">
                    {lFreeGift}
                  </span>
                  <p className="text-xs text-gray-400">
                    {L.qtyPrefix} {gift.quantity}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold tracking-wide text-green-600 uppercase">{lGiftFree}</p>
                {gift.price > 0 && (
                  <p className="text-xs text-gray-400 line-through">{fmt(gift.price * gift.quantity)}</p>
                )}
              </div>
            </div>
          ))}

          {/* ── Coupon ── */}
          <div className="border-t border-[#e5e7eb] pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#555] uppercase">
              <Tag size={12} />
              {lPromoLabel}
            </p>

            {appliedCoupon ? (
              <div className="flex items-center justify-between border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={13} className="shrink-0 text-green-600" />
                  <span className="font-mono text-xs font-bold tracking-widest text-green-600">{appliedCoupon}</span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="ml-2 shrink-0 transition-opacity hover:opacity-60 focus-visible:outline-none"
                >
                  <X size={13} className="text-gray-500" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-px">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    placeholder={lPromoPh}
                    className={`min-w-0 flex-1 rounded-none border px-3 py-2 font-mono text-xs tracking-widest uppercase outline-none ${
                      couponStatus === 'error' ? 'border-(--sale)' : 'border-[#d1d5db]'
                    }`}
                    onFocus={(e) => {
                      if (couponStatus !== 'error') e.target.style.borderColor = '#000';
                    }}
                    onBlur={(e) => {
                      if (couponStatus !== 'error') e.target.style.borderColor = '#d1d5db';
                    }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={!couponInput.trim() || couponLoading}
                    className={`flex min-w-16 shrink-0 items-center justify-center px-4 py-2 text-xs font-bold tracking-wide text-white uppercase transition-colors duration-200 focus-visible:outline-none ${
                      !couponInput.trim() || couponLoading
                        ? 'cursor-not-allowed bg-gray-400'
                        : 'cursor-pointer bg-black'
                    }`}
                  >
                    {couponLoading ? (
                      <span className="inline-block size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      lPromoApply
                    )}
                  </button>
                </div>
                {couponStatus === 'error' && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-(--sale)">
                    <X size={11} /> {couponError ?? L.promoInvalid}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-2 border-t border-[#e5e7eb] pt-3">
            {previewLoading && !hasPreview ? (
              <div className="flex justify-between text-xs" aria-busy="true">
                <div className="h-3 w-24 animate-pulse bg-gray-100" />
                <div className="h-3 w-12 animate-pulse bg-gray-100" />
              </div>
            ) : (
              <>
                {personalDiscount > 0 && (
                  <div className="flex justify-between text-xs text-(--sale)">
                    <span>{lLoyalty}</span>
                    <span className="font-semibold">−{fmt(personalDiscount)}</span>
                  </div>
                )}
                {couponDiscount > 0 && appliedCoupon && (
                  <div className="flex justify-between text-xs text-(--sale)">
                    <span>
                      {L.promo} ({appliedCoupon})
                    </span>
                    <span className="font-semibold">−{fmt(couponDiscount)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{lDelivery}</span>
              <span className="font-semibold text-green-600">{lFree}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-[#e5e7eb] pt-1">
              <span className="text-sm font-bold">{lTotal}</span>
              {previewLoading && !hasPreview ? (
                <div className="h-5 w-20 animate-pulse bg-gray-100" aria-busy="true" />
              ) : (
                <span className="text-lg font-bold">{fmt(finalTotal)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
