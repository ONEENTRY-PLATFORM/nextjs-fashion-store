'use client'
import Image from 'next/image';
import { CheckCircle, ChevronDown, X, Tag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { DELIVERY_SUMMARY_LABELS as L } from '../../data/checkoutLabels';
import { SALE_COLOR } from '../../constants/colors';
import { fmt } from '../../utils/formatPrice';
import { useT } from '../../../lib/oneentry/labels/CheckoutLabelsContext';

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
}: Props) {
  const { items, discount } = useCart();
  const lHeading      = useT('checkout_delivery', 'checkout_delivery_order_summary_title',          L.heading);
  const lPromoLabel   = useT('checkout_delivery', 'checkout_delivery_promo_code',                   L.promoCodeLabel);
  const lPromoPh      = useT('checkout_delivery', 'checkout_delivery_enter_promo_code',             L.promoPlaceholder);
  const lPromoApply   = useT('checkout_delivery', 'checkout_delivery_promocode_cta',                L.promoApply);
  const lDelivery     = useT('checkout_delivery', 'checkout_delivery_summary_delivery',             L.delivery);
  const lFree         = useT('checkout_delivery', 'checkout_delivery_order_summary_delivery_free',  L.deliveryFree);
  const lTotal        = useT('checkout_delivery', 'checkout_delivery_order_summary_total',          L.total);

  return (
    <div
      className="lg:w-80 xl:w-96 flex-shrink-0"
      style={{ '--sale': SALE_COLOR } as React.CSSProperties}
    >
      <div className="sticky top-32 border border-[#e5e7eb]">
        {/* Mobile toggle */}
        <button
          className={`w-full flex items-center justify-between px-6 py-4 focus-visible:outline-none lg:cursor-default ${
            summaryOpen ? 'border-b border-[#e5e7eb]' : ''
          }`}
          onClick={() => setSummaryOpen(o => !o)}
          aria-expanded={summaryOpen}
        >
          <h2 className="text-sm tracking-[0.15em] uppercase font-bold">
            {lHeading}
          </h2>
          <ChevronDown
            size={14}
            className={`lg:hidden transition-transform ${summaryOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>

        <div className="px-6 py-5 space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex gap-3">
              <div className="relative flex-shrink-0 w-12 h-14">
                <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug font-medium">{item.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-gray-400">{L.qtyPrefix} {item.quantity} · {L.sizePrefix} {item.size}</p>
                  {item.color && (
                    <>
                      <span className="text-xs text-gray-400">·</span>
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 inline-block border border-[#e5e7eb]"
                        style={{ backgroundColor: item.color }}
                      />
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs flex-shrink-0 font-semibold">{fmt(item.price * item.quantity)}</p>
            </div>
          ))}

          {/* ── Coupon ── */}
          <div className="border-t border-[#e5e7eb] pt-3">
            <p className="text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5 font-bold text-[#555]">
              <Tag size={12} />
              {lPromoLabel}
            </p>

            {appliedCoupon ? (
              <div className="flex items-center justify-between px-3 py-2 bg-[#f0fdf4] border border-[#bbf7d0]">
                <div className="flex items-center gap-2">
                  <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                  <span className="text-xs font-mono tracking-widest font-bold text-green-600">{appliedCoupon}</span>
                </div>
                <button onClick={handleRemoveCoupon} className="focus-visible:outline-none hover:opacity-60 transition-opacity ml-2 flex-shrink-0">
                  <X size={13} className="text-gray-500" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-px">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={e => { setCouponInput(e.target.value); }}
                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                    placeholder={lPromoPh}
                    className={`flex-1 px-3 py-2 text-xs outline-none font-mono tracking-widest uppercase min-w-0 border rounded-none ${
                      couponStatus === 'error' ? 'border-[var(--sale)]' : 'border-[#d1d5db]'
                    }`}
                    onFocus={e => { if (couponStatus !== 'error') e.target.style.borderColor = '#000'; }}
                    onBlur={e => { if (couponStatus !== 'error') e.target.style.borderColor = '#d1d5db'; }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={!couponInput.trim() || couponLoading}
                    className={`px-4 py-2 text-xs tracking-wide uppercase text-white focus-visible:outline-none flex items-center justify-center flex-shrink-0 font-bold min-w-16 transition-colors duration-200 ${
                      !couponInput.trim() || couponLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black cursor-pointer'
                    }`}
                  >
                    {couponLoading
                      ? <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : lPromoApply
                    }
                  </button>
                </div>
                {couponStatus === 'error' && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-[var(--sale)]">
                    <X size={11} /> {couponError ?? L.promoInvalid}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="border-t border-[#e5e7eb] pt-3 space-y-2">
            {discount > 0 && (
              <div className="flex justify-between text-xs text-[var(--sale)]">
                <span>{L.discount}</span>
                <span className="font-semibold">−{fmt(discount)}</span>
              </div>
            )}
            {previewLoading && !hasPreview ? (
              <div className="flex justify-between text-xs" aria-busy="true">
                <div className="h-3 w-24 bg-gray-100 animate-pulse" />
                <div className="h-3 w-12 bg-gray-100 animate-pulse" />
              </div>
            ) : (
              <>
                {personalDiscount > 0 && (
                  <div className="flex justify-between text-xs text-[var(--sale)]">
                    <span>Loyalty discount</span>
                    <span className="font-semibold">−{fmt(personalDiscount)}</span>
                  </div>
                )}
                {couponDiscount > 0 && appliedCoupon && (
                  <div className="flex justify-between text-xs text-[var(--sale)]">
                    <span>{L.promo} ({appliedCoupon})</span>
                    <span className="font-semibold">−{fmt(couponDiscount)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{lDelivery}</span>
              <span className="text-green-600 font-semibold">{lFree}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-[#e5e7eb]">
              <span className="text-sm font-bold">{lTotal}</span>
              {previewLoading && !hasPreview ? (
                <div className="h-5 w-20 bg-gray-100 animate-pulse" aria-busy="true" />
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
