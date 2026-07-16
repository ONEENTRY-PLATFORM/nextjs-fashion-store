'use client'
import React, { useState, useEffect } from 'react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { CheckoutStepper } from '../components/CheckoutStepper';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrderAction, previewOrderAction, type PreviewOrderResult } from '../../lib/oneentry/auth/actions';
import { trackActivity } from '../utils/track-activity';
import { getOrCreateGuestId } from '../utils/guest-id';
import { Lock, Shield } from 'lucide-react';
import { SALE_COLOR } from '../constants/colors';
import { fmt } from '../utils/formatPrice';
import { PAYMENT_PAGE_LABELS } from '../data/paymentMethodsConfig';
import { ORDER_SUMMARY_LABELS as OS } from '../data/checkoutLabels';
import { CART_LINE_LABELS as CLL } from '../data/commonLabels';
import { useT } from '../../lib/oneentry/labels/CheckoutLabelsContext';
import { getPaymentAccountsAction, type PaymentAccount } from '../../lib/oneentry/payments/accounts';
import { extractCmsProductId } from '../data/cms-product-id-map';
import { PaymentMethodsList } from './checkout/PaymentMethodsList';

export function PaymentPage() {
  const router = useRouter();
  const { items, discount, total, subtotal, clearCart, couponCode, preview: cartPreview, previewLoading: cartPreviewLoading, giftItems } = useCart();
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [method, setMethod] = useState<string>('');
  const lPayOnDelivery = useT('checkout_payment', 'checkout_payment_pay_on_delivery',     PAYMENT_PAGE_LABELS.payOnDeliverySection);
  const lOr            = useT('checkout_payment', 'checkout_payment_or',                  PAYMENT_PAGE_LABELS.orOnlinePrepayment);
  const lOnline        = useT('checkout_payment', 'checkout_payment_online_prepayment',   PAYMENT_PAGE_LABELS.onlinePrepaymentSection);
  const lPlaceOrder    = useT('checkout_payment', 'checkout_payment_cta',                 PAYMENT_PAGE_LABELS.placeOrderPrefix);
  const lSsl           = useT('checkout_payment', 'checkout_payment_ssl',                 PAYMENT_PAGE_LABELS.securityBadges[0] ?? '');
  const lPci           = useT('checkout_payment', 'checkout_payment_pci',                 PAYMENT_PAGE_LABELS.securityBadges[1] ?? '');
  const l3d            = useT('checkout_payment', 'checkout_payment_3d',                  PAYMENT_PAGE_LABELS.securityBadges[2] ?? '');
  const lStripeRedirect = useT(
    'checkout_payment',
    'checkout_payment_stripe_redirect_hint',
    "You'll be redirected to the payment provider's secure checkout to complete the payment.",
  );
  const securityBadges = [lSsl, lPci, l3d].filter(Boolean);

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
  const bonusUnlocked = bonusBalance > 0
    && (bonusMinOrderAmount == null || totalSumForGate >= bonusMinOrderAmount);
  // Hard cap: min(balance, per-order OE max). Falls back to balance alone
  // when OE hasn't reported a per-order cap yet (first render / no preview).
  const bonusCap = bonusMaxAmount > 0
    ? Math.min(bonusBalance, bonusMaxAmount)
    : bonusBalance;

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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
    return () => { cancelled = true; };
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
  const bonusUnderMin = bonusMinAmount != null && bonusRequested > 0
    && bonusRequested < bonusMinAmount;
  const bonusAmount = bonusUnlocked && !bonusUnderMin
    ? Math.min(bonusRequested, bonusCap)
    : 0;

  // Debounce previewOrder so typing into the bonus field doesn't spam OE.
  // `previewInFlight` gates the Place Order button so the shopper can't
  // submit a stale total — see the button block below.
  const [previewInFlight, setPreviewInFlight] = useState(false);
  const productsKey = JSON.stringify(productsForPreview);
  useEffect(() => {
    if (productsForPreview.length === 0) {
      setPreview(null);
      setPreviewInFlight(false);
      return;
    }
    setPreviewInFlight(true);
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
      setPreviewInFlight(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
    // productsKey covers the array; bonusAmount and couponCode are scalars.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, productsKey, bonusAmount, couponCode]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) { router.push('/'); return; }
    if (!selectedAccount) {
      setSubmitError('Please choose a payment method.');
      return;
    }
    // Preview is still in flight — the totals on screen might not yet
    // reflect the applied coupon / bonuses. Don't submit an order that
    // could get charged a different amount than the shopper saw.
    if (previewInFlight || !preview) return;

    let payload: {
      storage: 'home' | 'store_pickup' | 'locker';
      isGuest: boolean;
      guestContact?: { fullName?: string; phone?: string; email?: string } | null;
      homeAddress?: { fullName?: string; phone?: string; line1?: string; city?: string; postcode?: string; instructions?: string } | null;
      storeId?: string | number | null;
      lockerId?: string | number | null;
      deliveryDate?: string;
      deliverySlot?: string;
    } | null = null;
    try {
      const raw = sessionStorage.getItem('oe_checkout_payload');
      payload = raw ? JSON.parse(raw) : null;
    } catch { /* ignore */ }
    if (!payload) {
      setSubmitError('Delivery details missing — please go back to delivery step.');
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

    // Build formData per checkout form schema. Guest forms additionally
    // require contact info (full_name / phone / email); the authed forms
    // only need the delivery details.
    const formData: Array<{ marker: string; type: string; value: unknown }> = [];
    const guestPrefix = payload.isGuest ? '_guest' : '';
    if (payload.storage === 'home') {
      // Authed: delivery_method + delivery_date-time; Guest: also address.
      formData.push({
        marker: `delivery_method${guestPrefix}`,
        type: 'list',
        value: ['courier'],
      });
      // OE timeInterval expects array of [fromISO, toISO] tuples. Map the
      // morning/afternoon/evening slot to a concrete window on the chosen day.
      const slotToWindow: Record<string, [number, number]> = {
        morning: [9, 13], afternoon: [13, 17], evening: [17, 21],
      };
      const dayIso = (payload.deliveryDate ?? new Date().toISOString()).slice(0, 10);
      const [fromH, toH] = slotToWindow[payload.deliverySlot ?? 'morning'] ?? [9, 13];
      const fromIso = `${dayIso}T${String(fromH).padStart(2, '0')}:00:00.000Z`;
      const toIso = `${dayIso}T${String(toH).padStart(2, '0')}:00:00.000Z`;
      formData.push({
        marker: `delivery_date-time${guestPrefix}`,
        type: 'timeInterval',
        value: [[fromIso, toIso]],
      });
      if (payload.isGuest && payload.homeAddress) {
        // OE phone field caps at 15 chars; strip spaces so the formatted value fits.
        const compactPhone = (payload.homeAddress.phone ?? payload.guestContact?.phone ?? '').replace(/\s+/g, '');
        formData.push({ marker: 'checkout_home_guest_full_name', type: 'string', value: payload.homeAddress.fullName ?? payload.guestContact?.fullName ?? '' });
        formData.push({ marker: 'checkout_home_guest_phone', type: 'string', value: compactPhone });
        formData.push({ marker: 'checkout_home_guest_address_line1', type: 'string', value: payload.homeAddress.line1 ?? '' });
        formData.push({ marker: 'checkout_home_guest_city', type: 'string', value: payload.homeAddress.city ?? '' });
        formData.push({ marker: 'checkout_home_guest_post_code', type: 'string', value: payload.homeAddress.postcode ?? '' });
        if (payload.homeAddress.instructions) {
          formData.push({ marker: 'checkout_home_guest_special_instrations', type: 'string', value: payload.homeAddress.instructions });
        }
      }
    } else if (payload.storage === 'store_pickup') {
      formData.push({
        marker: payload.isGuest ? 'checkout_store_pickup_guest_store' : 'checkout_store_pickup_select_store',
        type: 'entity',
        // OE entity type accepts an array of ids on form-data; wrap to keep it valid.
        value: [String(payload.storeId ?? '')],
      });
      if (payload.isGuest && payload.guestContact) {
        formData.push({ marker: 'checkout_store_pickup_guest_full_name', type: 'string', value: payload.guestContact.fullName ?? '' });
        formData.push({ marker: 'checkout_store_pickup_guest_phone', type: 'string', value: (payload.guestContact.phone ?? '').replace(/\s+/g, '') });
        formData.push({ marker: 'checkout_store_pickup_guest_email', type: 'string', value: payload.guestContact.email ?? '' });
      }
    } else if (payload.storage === 'locker') {
      // OE rejects 0 as a missing integer value — shift by 1 so the first locker maps to 1.
      const lockerNum = typeof payload.lockerId === 'number'
        ? payload.lockerId + 1
        : (parseInt(String(payload.lockerId ?? '0'), 10) || 0) + 1;
      formData.push({
        marker: payload.isGuest ? 'checkout_locker_guest_pickup_point' : 'checkout_locker_pickup_point',
        type: 'integer',
        value: lockerNum,
      });
      if (payload.isGuest && payload.guestContact) {
        formData.push({ marker: 'checkout_locker_guest_full_name', type: 'string', value: payload.guestContact.fullName ?? '' });
        formData.push({ marker: 'checkout_locker_guest_phone', type: 'string', value: (payload.guestContact.phone ?? '').replace(/\s+/g, '') });
        formData.push({ marker: 'checkout_locker_guest_email', type: 'string', value: payload.guestContact.email ?? '' });
      }
    }

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
      setSubmitError(fresh.error || 'Cart could not be re-validated. Please review your cart and try again.');
      return;
    }
    // Total shifted vs. what the shopper saw — update the on-screen summary
    // and require an explicit re-confirm before actually creating the order.
    if (preview && Math.abs(fresh.totalDue - preview.totalDue) > 0.01) {
      setPreview(fresh);
      setPlacing(false);
      setSubmitError(`Order total changed to ${fmt(fresh.totalDue)} since you last reviewed it. Please check the summary and place the order again.`);
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
    const alreadyReconciled = preview
      && Math.abs(fresh.totalSum - preview.totalSum) < 0.01
      && Math.abs(fresh.totalDue - preview.totalDue) < 0.01;
    if (!alreadyReconciled && Math.abs(fresh.totalSum - subtotal) > 0.01) {
      setPreview(fresh);
      setPlacing(false);
      setSubmitError(`We now show ${fmt(fresh.totalDue)} at checkout — some sale prices no longer apply for this session. Please review the summary and place the order again.`);
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
      setSubmitError(res.error);
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
    try { sessionStorage.setItem('oe_last_order_id', String(res.orderId)); } catch { /* ignore */ }
    // Snapshot the actual charged amount for the Confirmation page — cart
    // is cleared above, so reading `useCart().total` on the next screen
    // returns 0 and the "Total Paid" line renders $0. Pass the OE-side
    // `preview.totalDue` (falls back to client `total` when preview
    // wasn't hydrated) so the shopper sees the real charge.
    try {
      sessionStorage.setItem('oe_last_order_total', String(finalTotal));
    } catch { /* ignore */ }
    // Stripe / online payment methods: OE returns a hosted checkout URL.
    // Redirect to it; the user finishes the payment on Stripe and OE marks
    // the order completed via webhook. Cash / card-on-delivery have no URL —
    // jump straight to the local confirmation page.
    if (res.paymentUrl) {
      try { sessionStorage.removeItem('oe_checkout_payload'); } catch { /* ignore */ }
      window.location.href = res.paymentUrl;
      return;
    }
    // Stripe was expected but no paymentUrl came back — surface the OE-side
    // error instead of silently pushing to the confirmation page. The order
    // stayed created on OE's side, but the buyer hasn't paid.
    if (selectedAccount.type === 'stripe') {
      setSubmitError(res.paymentSessionError
        ? `Stripe session could not be created: ${res.paymentSessionError}`
        : 'Stripe session could not be created. Please try again or pick another payment method.');
      return;
    }
    try { sessionStorage.removeItem('oe_checkout_payload'); } catch { /* ignore */ }
    router.push('/checkout/confirmation');
  };

  return (
    <div
      className="min-h-screen bg-white font-[Inter,sans-serif]"
      style={{ '--sale': SALE_COLOR } as React.CSSProperties}
    >
      <Header />

      <main id="main-content" className="max-w-screen-xl mx-auto px-4 lg:px-8 pb-20">
        {/* Stepper */}
        <div className="border-b border-[#e5e7eb]">
          <CheckoutStepper currentStep={2} />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 pt-8">
          {/* ── Left: Payment Options ── */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl tracking-[0.15em] uppercase mb-6 font-bold">
              {PAYMENT_PAGE_LABELS.pageTitle}
            </h1>

            {accountsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[76px] bg-gray-100 animate-pulse rounded-none" />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-gray-500 py-6">
                Payment methods are unavailable right now. Please try again later.
              </p>
            ) : (
              <PaymentMethodsList
                accounts={accounts}
                selected={method}
                onSelect={setMethod}
                offlineSectionTitle={lPayOnDelivery}
                onlineSectionTitle={lOnline}
                dividerLabel={lOr}
                redirectHint={lStripeRedirect}
              />
            )}

            {/* Security badges */}
            <div className="flex flex-wrap items-center gap-4 mt-6 px-4 py-3 bg-[#fafafa] border border-[#e5e7eb]">
              {securityBadges.map((badge, idx) => (
                <div key={badge} className="flex items-center gap-2 text-xs text-gray-500">
                  {idx === 1 ? <Lock size={14} className="text-green-600" /> : <Shield size={14} className="text-green-600" />}
                  <span>{badge}</span>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => router.push('/checkout/delivery')}
                className="flex items-center gap-2 text-sm focus-visible:outline-none hover:opacity-70 transition-opacity text-[#555]"
              >
                {PAYMENT_PAGE_LABELS.backToDelivery}
              </button>
              <div className="flex flex-col items-end gap-2">
                {submitError && (
                  <p className="text-xs text-[var(--sale)] max-w-md text-right">{submitError}</p>
                )}
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing || previewInFlight || !preview}
                  className="flex items-center justify-center gap-2 px-10 py-4 text-white text-sm tracking-[0.2em] uppercase focus-visible:outline-none hover:opacity-90 transition-opacity bg-black rounded-lg font-semibold disabled:opacity-60 disabled:pointer-events-none"
                >
                  {(placing || previewInFlight || !preview) && (
                    <span
                      className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {lPlaceOrder}{mounted ? ` · ${fmt(finalTotal)}` : ''}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:w-80 xl:w-96 flex-shrink-0">
            <div className="sticky top-32 border border-[#e5e7eb]">
              <div className="px-6 py-4 border-b border-[#e5e7eb]">
                <h2 className="text-sm tracking-[0.15em] uppercase font-bold">
                  {PAYMENT_PAGE_LABELS.orderSummary}
                </h2>
              </div>
              <div className="px-6 py-5 space-y-3">
                {mounted && items.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative flex-shrink-0 w-12 h-14">
                      <ImageWithFallback src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug font-medium">{item.name}</p>
                      <p className="text-xs text-gray-400">{CLL.qtyLabel} {item.quantity} · {CLL.sizeLabel} {item.size}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold">{fmt(item.price * item.quantity)}</p>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <p className="text-xs text-gray-400 line-through">{fmt(item.originalPrice * item.quantity)}</p>
                      )}
                    </div>
                  </div>
                ))}
                {mounted && giftItems.map(gift => (
                  <div key={`gift-${gift.productId}`} className="flex gap-3">
                    <div className="relative flex-shrink-0 w-12 h-14">
                      <ImageWithFallback src={gift.image} alt={gift.name} fill sizes="48px" className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug font-medium">{gift.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] tracking-widest uppercase font-bold text-green-600 bg-[#f0fdf4] border border-[#bbf7d0] px-1.5 py-0.5">
                          Free gift
                        </span>
                        <span className="text-xs text-gray-400">{CLL.qtyLabel} {gift.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Free</p>
                      {gift.price > 0 && (
                        <p className="text-xs text-gray-400 line-through">{fmt(gift.price * gift.quantity)}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div className="border-t border-[#e5e7eb] pt-3 space-y-2">
                  {/* Loyalty (personal tier) vs Promo (coupon) split so the
                      shopper can see which discount is which. `preview.
                      discountAmount` is the total OE deducted before bonuses;
                      `couponDiscountAmount` is the coupon's slice of that.
                      Skeleton while first preview is in flight so the panel
                      doesn't jump when discounts land. */}
                  {mounted && cartPreviewLoading && !activePreview ? (
                    <div className="flex justify-between text-xs" aria-busy="true">
                      <div className="h-3 w-24 bg-gray-100 animate-pulse" />
                      <div className="h-3 w-12 bg-gray-100 animate-pulse" />
                    </div>
                  ) : (
                    <>
                      {mounted && activePersonalDiscount > 0 && (
                        <div className="flex justify-between text-xs text-[var(--sale)]">
                          <span>{user?.status ?? 'Loyalty'} discount</span>
                          <span className="font-semibold">−{fmt(activePersonalDiscount)}</span>
                        </div>
                      )}
                      {mounted && activeCouponDiscount > 0 && couponCode && (
                        <div className="flex justify-between text-xs text-[var(--sale)]">
                          <span>Promo ({couponCode})</span>
                          <span className="font-semibold">−{fmt(activeCouponDiscount)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {mounted && activePreview && activePreview.bonusApplied > 0 && (
                    <div className="flex justify-between text-xs text-[var(--sale)]">
                      <span>Bonuses used</span>
                      <span className="font-semibold">−{fmt(activePreview.bonusApplied)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{OS.delivery}</span>
                    <span className="text-green-600 font-semibold">{OS.deliveryFree}</span>
                  </div>
                  {mounted && isLoggedIn && bonusBalance > 0 && (
                    <div className="pt-2 border-t border-[#e5e7eb]">
                      <div className="flex items-center justify-between gap-2">
                        <label htmlFor="bonus-input" className="text-xs text-gray-600">
                          Use bonuses
                          <span className="text-gray-400 ml-1">/ {bonusBalance.toLocaleString()} available</span>
                        </label>
                        <input
                          id="bonus-input"
                          type="number"
                          min={0}
                          max={bonusCap}
                          value={bonusInput}
                          onChange={(e) => setBonusInput(e.target.value)}
                          disabled={!bonusUnlocked}
                          className="w-20 text-right text-xs px-2 py-1 border border-gray-300 focus:border-black outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                          placeholder="0"
                        />
                      </div>
                      {/* Constraint hints — one line, only when relevant.
                          `min-order` gate takes priority: if the cart is too
                          small, the "min N per redemption" and "capped" hints
                          would be misleading. */}
                      {!bonusUnlocked && bonusMinOrderAmount != null && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Add {fmt(bonusMinOrderAmount - totalSumForGate)} more to use bonuses
                        </p>
                      )}
                      {bonusUnlocked && bonusUnderMin && bonusMinAmount != null && (
                        <p className="text-[10px] text-[var(--sale)] mt-1">
                          Minimum {bonusMinAmount.toLocaleString()} bonuses per redemption
                        </p>
                      )}
                      {bonusUnlocked && !bonusUnderMin && bonusRequested > bonusCap && bonusCap > 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Capped at {bonusCap.toLocaleString()} for this order
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-1 border-t border-[#e5e7eb]">
                    <span className="text-sm font-bold">{OS.total}</span>
                    {mounted && cartPreviewLoading && !activePreview ? (
                      <div className="h-5 w-20 bg-gray-100 animate-pulse" aria-busy="true" />
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

      <Footer />
    </div>
  );
}
