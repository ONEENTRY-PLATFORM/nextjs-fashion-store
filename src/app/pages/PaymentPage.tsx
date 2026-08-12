'use client';
import { Lock, Shield } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { CheckoutStepper } from '@/app/components/checkout/CheckoutStepper';
import { ImageWithFallback } from '@/app/components/ui/ImageWithFallback';
import { SALE_COLOR } from '@/app/constants/colors';
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';
import { extractCmsProductId } from '@/app/data/cms-product-id-map';
import { useMounted } from '@/app/hooks/useMounted';
import { CART_LINE_LABELS } from '@/app/pages/cart/copy';
import { fmt } from '@/app/utils/formatPrice';
import { getOrCreateGuestId } from '@/app/utils/guest-id';
import { trackActivity } from '@/app/utils/track-activity';
import { useRouter } from '@/lib/i18n/navigation';
import { createOrderAction, previewOrderAction, type PreviewOrderResult } from '@/lib/oneentry/auth/actions';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import { orderFormMarker } from '@/lib/oneentry/checkout/forms';
import { buildOrderFieldLabels, explainOrderError } from '@/lib/oneentry/checkout/order-error';
import { buildOrderFormData, type CheckoutHandoffPayload } from '@/lib/oneentry/checkout/order-form-data';
import { useAllFormContent } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { useDict } from '@/lib/oneentry/labels/DictContext';
import { getPaymentAccountsAction, type PaymentAccount } from '@/lib/oneentry/payments/accounts';

import { PaymentMethodsList } from './checkout/PaymentMethodsList';

export const ORDER_SUMMARY_LABELS = {
  heading: 'Order Summary',
  qtyPrefix: 'Qty',
  sizePrefix: 'Size',
  discount: 'Discount',
  delivery: 'Delivery',
  deliveryFree: 'Free',
  total: 'Total',
} as const;

/**
 * Payment screen copy, overlaid from the OE `checkout_payment` set.
 *
 * Keys are named so that `prefix + snake_case(key)` lands on the marker the
 * admin panel already holds — `payOnDelivery` → `checkout_payment_pay_on_delivery`
 * — which is what let this screen swap 26 hand-written `useT` calls for one
 * `useDict` without touching a single value in the CMS.
 */
export const PAYMENT_PAGE_LABELS = {
  title: 'Payment Method',
  payOnDelivery: 'Pay on Delivery',
  onlinePrepayment: 'Online Prepayment',
  or: 'Or Online Prepayment',
  orderSummary: 'Order Summary',
  backToDelivery: '← Back to Delivery',
  cta: 'Place Order',
  ssl: 'SSL Encrypted',
  pci: 'PCI DSS Compliant',
  // `3d` on purpose: `snakeKey('3d')` is `3d`, so the marker stays
  // `checkout_payment_3d`.
  '3d': '3D Secure',
  stripeRedirectHint: "You'll be redirected to the payment provider's secure checkout to complete the payment.",
  freeGift: 'Free gift',
  giftFree: 'Free',
  loyaltyTier: 'Loyalty',
  discountSuffix: 'discount',
  promoPrefix: 'Promo',
  bonusesUsed: 'Bonuses used',
  useBonuses: 'Use bonuses',
  bonusAvailable: 'available',
  errorNoMethod: 'Please choose a payment method.',
  errorNoDelivery: 'Delivery details missing — please go back to delivery step.',
  errorRevalidate: 'Cart could not be re-validated. Please review your cart and try again.',
  errorStripe: 'Stripe session could not be created. Please try again or pick another payment method.',
  errorNoAccounts: 'Payment methods are unavailable right now. Please try again later.',
  errorFieldHint: 'Please go back to the delivery step and correct that field.',
  errorFormUnavailable: 'Checkout is temporarily unavailable. Please refresh the page and try again.',
} as const;

export function PaymentPage({ pageBlocks }: { pageBlocks?: PageBlock[] } = {}) {
  const OS = useDict('checkout_payment_summary_', ORDER_SUMMARY_LABELS);
  const CLL = useDict('interface_controls_cart_line_', CART_LINE_LABELS);
  const router = useRouter();
  const {
    items,
    total,
    subtotal,
    clearCart,
    couponCode,
    preview: cartPreview,
    previewLoading: cartPreviewLoading,
    giftItems,
  } = useCart();
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [method, setMethod] = useState<string>('');
  // One overlay instead of 26 `useT` calls: every key here resolves to the
  // marker it already had (`payOnDelivery` → `checkout_payment_pay_on_delivery`),
  // so the CMS side is untouched.
  const L = useDict('checkout_payment_', PAYMENT_PAGE_LABELS);
  const securityBadges = [L.ssl, L.pci, L['3d']].filter(Boolean);

  // OE rejects an order by naming the raw attribute marker of the offending
  // field. Every checkout form is loaded by the route shell, so the label the
  // shopper saw is available here — authored in the admin panel, not mirrored
  // into a table that would silently stop matching after a rename.
  const checkoutForms = useAllFormContent();
  const orderFieldLabels = useMemo(() => buildOrderFieldLabels(Object.values(checkoutForms)), [checkoutForms]);

  const { isLoggedIn, user } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const [placing, setPlacing] = useState(false);
  // OE `previewOrder` — recalculates the order server-side with the active
  // personal discount (Bronze / …) and, if the shopper asks, a bonus
  // deduction. Refreshed whenever the cart or bonusAmount changes.
  const [preview, setPreview] = useState<PreviewOrderResult | null>(null);
  const [bonusInput, setBonusInput] = useState<string>('');
  // Prefer OE's per-request bonus figures (from `previewOrder.discountConfig.bonus`)
  // over the client-cached balance from `fetchLoyalty`. Falls back to the
  // cached value while the first preview is still in flight.
  const bonusBalance = preview?.bonus.availableBalance ?? user?.bonuses ?? 0;
  const bonusMaxAmount = preview?.bonus.maxAmount ?? 0;
  const bonusMinAmount = preview?.bonus.minAmount ?? null;
  const bonusMinOrderAmount = preview?.bonus.minOrderAmount ?? null;
  const totalSumForGate = preview?.totalSum ?? 0;
  const bonusUnlocked = bonusBalance > 0 && (bonusMinOrderAmount == null || totalSumForGate >= bonusMinOrderAmount);
  // Hard cap: min(balance, per-order OE max). Falls back to balance alone
  // when OE hasn't reported a per-order cap yet (first render / no preview).
  const bonusCap = bonusMaxAmount > 0 ? Math.min(bonusBalance, bonusMaxAmount) : bonusBalance;

  // Prefer the LOCAL `preview` over the CartContext-wide `cartPreview` for
  // every totals derivation on this page. The local one is refreshed on
  // bonus edits AND re-fetched authoritatively right before `createOrder`
  // (see `handlePlaceOrder`), so it reflects the freshest OE numbers.
  // Falling back to `cartPreview` covers the first render before the local
  // preview has landed. Without this, a stale sale-price rule that OE
  // dropped mid-session would surface in the warning banner ("we now show
  // $35") but leave the CTA + Order Summary showing the old optimistic
  // $31.5, and the Confirmation snapshot would record the wrong amount.
  const activePreview = preview ?? cartPreview;
  const activePersonalDiscount = Math.max(
    0,
    (activePreview?.discountAmount ?? 0) - (activePreview?.couponDiscountAmount ?? 0),
  );
  const activeCouponDiscount = activePreview?.couponDiscountAmount ?? 0;
  const activeTotalDue = activePreview?.totalDue ?? total;
  // Trust OE's `totalDue` unconditionally when a preview is available.
  //
  // The previous shape mirrored CartPage / DeliveryPage and only surfaced
  // `activeTotalDue` when at least one discount was applied — otherwise
  // fell back to client `total`. That worked when the only OE↔client gap
  // was "OE knocked something off"; it broke the opposite direction.
  //
  // Concrete failure: the catalog optimistic overlay marks a product on
  // sale ($31.5) client-side, but the OE `Discounts` rule requires a
  // user-group the shopper isn't in, so OE ships `productDiscounts: []`
  // and quotes the full $35. Fresh preview arrives with `discountAmount=0`
  // AND `totalDue=35`, all three flags stay false, `finalTotal` collapses
  // to client `total=31.5`, the CTA and `oe_last_order_total` snapshot
  // show 31.5 — even though the warning banner just told the shopper OE
  // will charge $35. Confirmation then records 31.5 as the paid amount.
  //
  // OE `previewOrder` is authoritative for what the shopper will actually
  // be charged; if we have a preview, we quote its number.
  const finalTotal = activePreview ? activeTotalDue : total;

  // Redux cart hydrates from localStorage inside makeStore(), so the client's
  // first paint already has the real items while SSR HTML has an empty cart.
  // Gate every cart-derived value on `mounted` so the initial client render
  // matches the server, then reveal totals after the mount effect fires.
  const mounted = useMounted();

  // Route-level guard: deep-linking `/checkout/payment` with an empty
  // cart used to render the whole payment picker (and a $0 total from
  // `previewOrder({products:[]})`) and only bounce at click-time. Send
  // the shopper back to the cart page as soon as the client knows the
  // cart is empty — keeps the picker from painting confusing state.
  // Same intent as the cart-empty check inside `handlePlaceOrder` at
  // line ~150, but earlier.
  useEffect(() => {
    if (!mounted) return;
    if (items.length === 0) router.push('/cart');
  }, [mounted, items.length, router]);

  // Load payment accounts from OE on mount. The default selection is the
  // first visible account so "Place Order" is immediately actionable.
  useEffect(() => {
    let cancelled = false;
    void getPaymentAccountsAction().then((list) => {
      if (cancelled) return;
      setAccounts(list);
      if (list.length > 0) setMethod(list[0].identifier);
      setAccountsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAccount = accounts.find((a) => a.identifier === method);

  // Cart → OE products list. Preview endpoint takes the same shape as
  // createOrder — quantity + numeric productId. Cart items sometimes carry
  // suffixed ids (`${cmsId}-fav`, `-quick`, …) from Favorites / QuickView
  // add paths — `extractCmsProductId` strips those and leaves the leading
  // numeric productId.
  const productsForPreview = items.flatMap((it) => {
    const cmsId = extractCmsProductId(it.id);
    if (cmsId === null) return [];
    return [{ productId: cmsId, quantity: it.quantity }];
  });
  // Requested vs. sendable amount:
  //   - `bonusRequested` is what the shopper typed (used for the "you need
  //     at least N" hint below the input).
  //   - `bonusAmount` is what we actually send to previewOrder / createOrder:
  //     0 when the request is under the `minBonusAmount` gate, otherwise
  //     clamped to `bonusCap`. That way OE never rejects the request for
  //     under-min and we don't over-promise on the summary line.
  const bonusRequested = Math.max(0, Number(bonusInput) || 0);
  const bonusUnderMin = bonusMinAmount != null && bonusRequested > 0 && bonusRequested < bonusMinAmount;
  const bonusAmount = bonusUnlocked && !bonusUnderMin ? Math.min(bonusRequested, bonusCap) : 0;

  // Debounce previewOrder so typing into the bonus field doesn't spam OE.
  // `previewInFlight` gates the Place Order button so the shopper can't
  // submit a stale total — see the button block below.
  // Tracks which cart+bonus+coupon signature the current `preview` answers
  // for. "In flight" is then derived during render — the effect only ever
  // records a finished response, never flips a loading flag on entry (that
  // would be a synchronous `setState` inside `useEffect`).
  const [previewFor, setPreviewFor] = useState<string | null>(null);
  const productsKey = JSON.stringify(productsForPreview);
  const hasPreviewableItems = productsForPreview.length > 0;
  const previewSignature = `${productsKey}|${bonusAmount}|${couponCode ?? ''}`;
  const previewInFlight = hasPreviewableItems && previewFor !== previewSignature;
  useEffect(() => {
    if (!hasPreviewableItems) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const guestId = isLoggedIn ? undefined : getOrCreateGuestId();
      const r = await previewOrderAction({
        products: productsForPreview,
        bonusAmount,
        ...(couponCode ? { couponCode } : {}),
        ...(guestId ? { guestId } : {}),
      });
      if (cancelled) return;
      if (r.ok) setPreview(r);
      setPreviewFor(previewSignature);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // productsKey covers the array; bonusAmount and couponCode are scalars.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, productsKey, bonusAmount, couponCode]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      router.push('/');
      return;
    }
    if (!selectedAccount) {
      setSubmitError(L.errorNoMethod);
      return;
    }
    // Preview is still in flight — the totals on screen might not yet
    // reflect the applied coupon / bonuses. Don't submit an order that
    // could get charged a different amount than the shopper saw.
    if (previewInFlight || !preview) return;

    let payload: CheckoutHandoffPayload | null = null;
    try {
      const raw = sessionStorage.getItem('oe_checkout_payload');
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      /* ignore */
    }
    if (!payload) {
      setSubmitError(L.errorNoDelivery);
      return;
    }

    // The selected account's `identifier` is exactly what OE expects for
    // `paymentAccountIdentifier` on the order. `type` decides whether we
    // route through Stripe hosted checkout after the order is created.
    const paymentAccountIdentifier = selectedAccount.identifier;

    // Map cart-item ids to numeric OE productIds via the same suffix-tolerant
    // helper `productsForPreview` uses so a Favorites/QuickView/-fav/-quick
    // cart line resolves to a real OE product instead of silently dropping.
    const products = items.flatMap((it) => {
      const cmsId = extractCmsProductId(it.id);
      if (cmsId === null) return [];
      return [{ productId: cmsId, quantity: it.quantity }];
    });

    // The order body is assembled from the CMS form the order is filed into,
    // which is what supplies every field marker (see `order-form-data.ts`).
    // A form that did not load fails the build rather than posting a body OE
    // is certain to reject by naming a raw marker under this button.
    const orderForm = checkoutForms[orderFormMarker(payload.storage, payload.isGuest)];
    const built = buildOrderFormData(payload, orderForm);
    if (!built.ok) {
      setSubmitError(L.errorFormUnavailable);
      return;
    }
    const formData = built.formData;

    // OE marks anonymous orders by `x-guest-id`. The shared helper mints a
    // stable per-browser id (or returns the existing one) so multi-page guest
    // checkouts and later look-ups resolve to the same session.
    const guestId = payload.isGuest ? getOrCreateGuestId() : undefined;

    setPlacing(true);

    // Fresh authoritative preview right before createOrder. The debounced
    // preview above may be minutes stale — the shopper could have stayed on
    // this page picking a payment method, and PDP/catalog HTML is now
    // served from ISR cache (up to 2 minutes for PDP / 60 s for catalog) so
    // price or stock could have changed since the item entered the cart.
    // OE rejects the preview outright when a line item is unavailable or
    // its price is undefined; we surface that instead of pushing a bad
    // createOrder request through.
    const freshPreviewGuestId = payload.isGuest ? guestId : undefined;
    const fresh = await previewOrderAction({
      products: productsForPreview,
      bonusAmount,
      ...(couponCode ? { couponCode } : {}),
      ...(freshPreviewGuestId ? { guestId: freshPreviewGuestId } : {}),
    });
    if (!fresh.ok) {
      setPlacing(false);
      setSubmitError(fresh.error || L.errorRevalidate);
      return;
    }
    // Total shifted vs. what the shopper saw — update the on-screen summary
    // and require an explicit re-confirm before actually creating the order.
    if (preview && Math.abs(fresh.totalDue - preview.totalDue) > 0.01) {
      setPreview(fresh);
      setPlacing(false);
      setSubmitError(
        `Order total changed to ${fmt(fresh.totalDue)} since you last reviewed it. Please check the summary and place the order again.`,
      );
      return;
    }
    // Client-optimistic sale (catalog `applyProductDiscount` overlay) may
    // disagree with what OE actually charges — a common case is a tenant
    // whose Discount rule requires a user_group the shopper isn't in, so
    // OE ships `productDiscounts: []` while the cart already reflects the
    // sale. The previous OE↔OE check misses this because both totals come
    // from OE. Compare OE's `totalSum` (its own subtotal) against the
    // client `subtotal` (sum of sale-baked `item.price`) and surface the
    // gap so the shopper explicitly re-confirms the higher amount.
    //
    // Skip when the on-screen `preview` already matches `fresh` — a previous
    // click surfaced the banner, `setPreview(fresh)` propagated the honest
    // number to Total + CTA, and the shopper's second click IS the re-confirm.
    // Without this skip the guard fires on every click (client `subtotal`
    // never catches up to the OE-honest total) and the order cannot be placed.
    const alreadyReconciled =
      preview &&
      Math.abs(fresh.totalSum - preview.totalSum) < 0.01 &&
      Math.abs(fresh.totalDue - preview.totalDue) < 0.01;
    if (!alreadyReconciled && Math.abs(fresh.totalSum - subtotal) > 0.01) {
      setPreview(fresh);
      setPlacing(false);
      setSubmitError(
        `We now show ${fmt(fresh.totalDue)} at checkout — some sale prices no longer apply for this session. Please review the summary and place the order again.`,
      );
      return;
    }
    setPreview(fresh);

    const res = await createOrderAction({
      storage: payload.storage,
      paymentAccount: paymentAccountIdentifier,
      paymentAccountType: selectedAccount.type,
      products,
      formData,
      guestId,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      // Preview echoed OE's clamp; we forward the same requested amount so
      // the created order gets the exact deduction the shopper saw.
      ...(bonusAmount > 0 ? { bonusAmount } : {}),
      ...(couponCode ? { couponCode } : {}),
    });
    setPlacing(false);
    if (!res.ok) {
      // OE names the offending attribute by its raw marker; translate it to the
      // label the shopper saw so the message is actionable.
      setSubmitError(explainOrderError(res.error, L.errorFieldHint, orderFieldLabels));
      return;
    }
    // Record a purchase event per line item so each product's purchase
    // counter increments correctly. Fire-and-forget — must not block the
    // post-order navigation.
    for (const p of products) {
      trackActivity({
        type: 'product_purchase',
        productId: p.productId,
        meta: { orderId: res.orderId, quantity: p.quantity, paymentMethod: paymentAccountIdentifier },
      });
    }
    // Order is created — wipe the cart NOW instead of waiting for the
    // shopper to land on /checkout/confirmation. Otherwise a closed tab
    // during Stripe redirect (or a cancelled Stripe session) leaves the
    // just-ordered items sitting in their bag next time they open the site.
    clearCart();
    // Real OE order id — Confirmation reads this from sessionStorage instead
    // of hallucinating a random `OE-XXXXXXXX` for the shopper (a fake id was
    // useless in a support call). Falls back to a random id only if this
    // read fails, e.g. after the Stripe round-trip when sessionStorage cleared.
    try {
      sessionStorage.setItem('oe_last_order_id', String(res.orderId));
    } catch {
      /* ignore */
    }
    // Snapshot the actual charged amount for the Confirmation page — cart
    // is cleared above, so reading `useCart().total` on the next screen
    // returns 0 and the "Total Paid" line renders $0. Pass the OE-side
    // `preview.totalDue` (falls back to client `total` when preview
    // wasn't hydrated) so the shopper sees the real charge.
    try {
      sessionStorage.setItem('oe_last_order_total', String(finalTotal));
    } catch {
      /* ignore */
    }
    // Stripe / online payment methods: OE returns a hosted checkout URL.
    // Redirect to it; the user finishes the payment on Stripe and OE marks
    // the order completed via webhook. Cash / card-on-delivery have no URL —
    // jump straight to the local confirmation page.
    if (res.paymentUrl) {
      try {
        sessionStorage.removeItem('oe_checkout_payload');
      } catch {
        /* ignore */
      }
      window.location.href = res.paymentUrl;
      return;
    }
    // Stripe was expected but no paymentUrl came back — surface the OE-side
    // error instead of silently pushing to the confirmation page. The order
    // stayed created on OE's side, but the buyer hasn't paid.
    if (selectedAccount.type === 'stripe') {
      setSubmitError(
        res.paymentSessionError ? `Stripe session could not be created: ${res.paymentSessionError}` : L.errorStripe,
      );
      return;
    }
    try {
      sessionStorage.removeItem('oe_checkout_payload');
    } catch {
      /* ignore */
    }
    router.push('/checkout/confirmation');
  };

  return (
    <div className="flex-1 bg-white font-sans" style={{ '--sale': SALE_COLOR } as React.CSSProperties}>
      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        {/* Stepper */}
        <div className="border-b border-[#e5e7eb]">
          <CheckoutStepper currentStep={2} />
        </div>

        <div className="flex flex-col gap-8 pt-8 lg:flex-row">
          {/* ── Left: Payment Options ── */}
          <div className="min-w-0 flex-1">
            <h1 className="mb-6 text-xl font-bold tracking-[0.15em] uppercase">{L.title}</h1>

            {accountsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-19 animate-pulse rounded-none bg-gray-100" />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <p className="py-6 text-sm text-gray-500">{L.errorNoAccounts}</p>
            ) : (
              <PaymentMethodsList
                accounts={accounts}
                selected={method}
                onSelect={setMethod}
                offlineSectionTitle={L.payOnDelivery}
                onlineSectionTitle={L.onlinePrepayment}
                dividerLabel={L.or}
                redirectHint={L.stripeRedirectHint}
              />
            )}

            {/* Security badges */}
            <div className="mt-6 flex flex-wrap items-center gap-4 border border-[#e5e7eb] bg-[#fafafa] px-4 py-3">
              {securityBadges.map((badge, idx) => (
                <div key={badge} className="flex items-center gap-2 text-xs text-gray-500">
                  {idx === 1 ? (
                    <Lock size={14} className="text-green-600" />
                  ) : (
                    <Shield size={14} className="text-green-600" />
                  )}
                  <span>{badge}</span>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => router.push('/checkout/delivery')}
                className="flex items-center gap-2 text-sm text-[#555] transition-opacity hover:opacity-70 focus-visible:outline-none"
              >
                {L.backToDelivery}
              </button>
              <div className="flex flex-col items-end gap-2">
                {submitError && <p className="max-w-md text-right text-xs text-(--sale)">{submitError}</p>}
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing || previewInFlight || !preview}
                  className="flex items-center justify-center gap-2 rounded-lg bg-black px-10 py-4 text-sm font-semibold tracking-[0.2em] text-white uppercase transition-opacity hover:opacity-90 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
                >
                  {(placing || previewInFlight || !preview) && (
                    <span
                      className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {L.cta}
                    {mounted ? ` · ${fmt(finalTotal)}` : ''}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="shrink-0 lg:w-80 xl:w-96">
            <div className="sticky top-32 border border-[#e5e7eb]">
              <div className="border-b border-[#e5e7eb] px-6 py-4">
                <h2 className="text-sm font-bold tracking-[0.15em] uppercase">{L.orderSummary}</h2>
              </div>
              <div className="space-y-3 px-6 py-5">
                {mounted &&
                  items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative h-14 w-12 shrink-0">
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug font-medium">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          {CLL.qtyLabel} {item.quantity} · {CLL.sizeLabel} {item.size}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold">{fmt(item.price * item.quantity)}</p>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <p className="text-xs text-gray-400 line-through">
                            {fmt(item.originalPrice * item.quantity)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                {mounted &&
                  giftItems.map((gift) => (
                    <div key={`gift-${gift.productId}`} className="flex gap-3">
                      <div className="relative h-14 w-12 shrink-0">
                        <ImageWithFallback
                          src={gift.image}
                          alt={gift.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug font-medium">{gift.name}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="border border-[#bbf7d0] bg-[#f0fdf4] px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-green-600 uppercase">
                            {L.freeGift}
                          </span>
                          <span className="text-xs text-gray-400">
                            {CLL.qtyLabel} {gift.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold tracking-wide text-green-600 uppercase">{L.giftFree}</p>
                        {gift.price > 0 && (
                          <p className="text-xs text-gray-400 line-through">{fmt(gift.price * gift.quantity)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                <div className="space-y-2 border-t border-[#e5e7eb] pt-3">
                  {/* Loyalty (personal tier) vs Promo (coupon) split so the
                      shopper can see which discount is which. `preview.
                      discountAmount` is the total OE deducted before bonuses;
                      `couponDiscountAmount` is the coupon's slice of that.
                      Skeleton while first preview is in flight so the panel
                      doesn't jump when discounts land. */}
                  {mounted && cartPreviewLoading && !activePreview ? (
                    <div className="flex justify-between text-xs" aria-busy="true">
                      <div className="h-3 w-24 animate-pulse bg-gray-100" />
                      <div className="h-3 w-12 animate-pulse bg-gray-100" />
                    </div>
                  ) : (
                    <>
                      {mounted && activePersonalDiscount > 0 && (
                        <div className="flex justify-between text-xs text-(--sale)">
                          <span>
                            {user?.status ?? L.loyaltyTier} {L.discountSuffix}
                          </span>
                          <span className="font-semibold">−{fmt(activePersonalDiscount)}</span>
                        </div>
                      )}
                      {mounted && activeCouponDiscount > 0 && couponCode && (
                        <div className="flex justify-between text-xs text-(--sale)">
                          <span>
                            {L.promoPrefix} ({couponCode})
                          </span>
                          <span className="font-semibold">−{fmt(activeCouponDiscount)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {mounted && activePreview && activePreview.bonusApplied > 0 && (
                    <div className="flex justify-between text-xs text-(--sale)">
                      <span>{L.bonusesUsed}</span>
                      <span className="font-semibold">−{fmt(activePreview.bonusApplied)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{OS.delivery}</span>
                    <span className="font-semibold text-green-600">{OS.deliveryFree}</span>
                  </div>
                  {mounted && isLoggedIn && bonusBalance > 0 && (
                    <div className="border-t border-[#e5e7eb] pt-2">
                      <div className="flex items-center justify-between gap-2">
                        <label htmlFor="bonus-input" className="text-xs text-gray-600">
                          {L.useBonuses}
                          <span className="ml-1 text-gray-400">
                            / {bonusBalance.toLocaleString()} {L.bonusAvailable}
                          </span>
                        </label>
                        <input
                          id="bonus-input"
                          type="number"
                          min={0}
                          max={bonusCap}
                          value={bonusInput}
                          onChange={(e) => setBonusInput(e.target.value)}
                          disabled={!bonusUnlocked}
                          className="w-20 border border-gray-300 px-2 py-1 text-right text-xs outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                          placeholder="0"
                        />
                      </div>
                      {/* Constraint hints — one line, only when relevant.
                          `min-order` gate takes priority: if the cart is too
                          small, the "min N per redemption" and "capped" hints
                          would be misleading. */}
                      {!bonusUnlocked && bonusMinOrderAmount != null && (
                        <p className="mt-1 text-[10px] text-gray-400">
                          Add {fmt(bonusMinOrderAmount - totalSumForGate)} more to use bonuses
                        </p>
                      )}
                      {bonusUnlocked && bonusUnderMin && bonusMinAmount != null && (
                        <p className="mt-1 text-[10px] text-(--sale)">
                          Minimum {bonusMinAmount.toLocaleString()} bonuses per redemption
                        </p>
                      )}
                      {bonusUnlocked && !bonusUnderMin && bonusRequested > bonusCap && bonusCap > 0 && (
                        <p className="mt-1 text-[10px] text-gray-400">
                          Capped at {bonusCap.toLocaleString()} for this order
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex items-baseline justify-between border-t border-[#e5e7eb] pt-1">
                    <span className="text-sm font-bold">{OS.total}</span>
                    {mounted && cartPreviewLoading && !activePreview ? (
                      <div className="h-5 w-20 animate-pulse bg-gray-100" aria-busy="true" />
                    ) : (
                      <span className="text-lg font-bold">{mounted ? fmt(finalTotal) : ''}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* OE-attached blocks for the `payment` page — rendered below the
          payment form. Empty → nothing renders. */}
      {pageBlocks && pageBlocks.length > 0 && <PageBlocksRenderer blocks={pageBlocks} />}
    </div>
  );
}
