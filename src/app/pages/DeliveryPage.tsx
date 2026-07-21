'use client'
import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { CheckoutStepper } from '../components/CheckoutStepper';
import { PageBlocksRenderer } from '../components/PageBlocksRenderer';
import { useCart } from '../context/CartContext';

// Render Order Summary client-only — its content reads from the Redux cart
// slice which hydrates from localStorage after mount. SSR rendering it
// would produce an empty (or stale) snapshot that conflicts with the
// post-hydration client tree.
const DeliveryOrderSummary = dynamic(
  () => import('./checkout/DeliveryOrderSummary').then(m => m.DeliveryOrderSummary),
  { ssr: false },
);
import { useAuth } from '../context/AuthContext';
import type { OeAddress } from '../../lib/oneentry/auth/actions';
import { PICKUP_STORES, PARCEL_LOCKERS, DELIVERY_TIME_SLOTS, type PickupStore } from '../data/checkoutConfig';
import { addressSchema, guestContactSchema } from '../utils/schemas';

import { ACCENT_WOMEN as ACCENT, SALE_COLOR } from '../constants/colors';
import { GuestCheckoutModal } from './checkout/GuestCheckoutModal';
import { type GuestContactFormState } from './checkout/GuestContactForm';
import { DeliveryMethodStore } from './checkout/DeliveryMethodStore';
import { DeliveryMethodLocker } from './checkout/DeliveryMethodLocker';
import { DeliveryMethodHome } from './checkout/DeliveryMethodHome';
import { DELIVERY_PAGE_LABELS as L, DELIVERY_METHOD_HOME_LABELS as DH } from '../data/checkoutLabels';
import { useT } from '../../lib/oneentry/labels/CheckoutLabelsContext';
import type { DeliveryTimeSlot } from '../../lib/oneentry/checkout/delivery-schedule';

type DeliveryMethod = 'home' | 'store' | 'locker';

/** Client-only fallback: when the server layer didn't hand a date strip
 *  down (e.g. Storybook / bare unit test render), synthesise the same
 *  "tomorrow, skip Sundays, 7 dates" shape the OE loader would produce
 *  from its own fallback config. Kept in sync with `FALLBACK` in
 *  `delivery-schedule.ts` — do NOT re-derive from OE here, this branch
 *  only fires when there is no server layer at all. */
function getDeliveryDates(count = 7): Date[] {
  const dates: Date[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  let maxIterations = 60;
  while (dates.length < count && maxIterations-- > 0) {
    if (d.getDay() !== 0) dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}


interface DeliveryPageProps {
  /** Pickup stores loaded from OE by the server layer. When OE has none the
   *  server passes the hardcoded `PICKUP_STORES` fallback so the picker still
   *  renders. */
  pickupStores?: PickupStore[];
  /** ISO-serialised date strip for the authed variant — built server-side
   *  from `checkout_home_delivery`'s schedule config. When omitted —
   *  Storybook / bare unit tests — the component regenerates it from the
   *  same 7-days/skip-Sun defaults. */
  deliveryDatesIsoAuthed?: string[];
  /** ISO-serialised date strip for the guest variant — built from
   *  `checkout_home_delivery_guest`'s schedule config. Same fallback. */
  deliveryDatesIsoGuest?: string[];
  /** Slots from `checkout_home_delivery.delivery_slot`. Fallback:
   *  `DELIVERY_TIME_SLOTS`. */
  deliverySlotsAuthed?: DeliveryTimeSlot[];
  /** Slots from `checkout_home_delivery_guest.delivery_slot_guest`. */
  deliverySlotsGuest?: DeliveryTimeSlot[];
  /** OE-attached blocks for the `delivery_method` page. */
  pageBlocks?: import('../../lib/oneentry/blocks/page-blocks').PageBlock[];
}

export function DeliveryPage({
  pickupStores,
  deliveryDatesIsoAuthed,
  deliveryDatesIsoGuest,
  deliverySlotsAuthed,
  deliverySlotsGuest,
  pageBlocks,
}: DeliveryPageProps = {}) {
  const router = useRouter();
  const { isLoggedIn, openLoginModal, openRegisterModal, user, updateAddresses } = useAuth();
  // Fall back to the literal list if the server layer didn't hand any down —
  // keeps Storybook and unit tests that render <DeliveryPage /> bare working.
  const stores: PickupStore[] = pickupStores && pickupStores.length > 0
    ? pickupStores
    : PICKUP_STORES;
  const {
    items,
    total, personalDiscount, totalDue,
    couponCode, couponDiscount, couponError, applyCoupon, removeCoupon, giftItems,
    preview, previewLoading,
  } = useCart();
  const lBackToCart  = useT('checkout_delivery', 'checkout_delivery_back_to_cart',        L.backToCart);
  const lContinue    = useT('checkout_delivery', 'checkout_delivery_continue_to_payment', L.continueToPayment);
  // Saved addresses come straight from OE for the signed-in user.
  const savedAddresses = user?.addresses ?? [];

  const [method, setMethod] = useState<DeliveryMethod>('home');
  const [selectedStore, setSelectedStore] = useState<PickupStore>(stores[0]);
  const [selectedLocker, setSelectedLocker] = useState(PARCEL_LOCKERS[0]);
  const [storeDropOpen, setStoreDropOpen] = useState(false);
  const [lockerDropOpen, setLockerDropOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  // Pick the OE schedule for the current auth state. Guests hit the
  // `_guest`-suffixed form on OE (`checkout_home_delivery_guest`); authed
  // users get the plain form. Server-side both strips are precomputed and
  // handed down as ISO arrays so the flip is a pure prop swap — no client
  // data fetching. Falls back to the client's `getDeliveryDates(7)` when
  // no strip was supplied at all (Storybook, bare unit test).
  const activeDatesIso = isLoggedIn ? deliveryDatesIsoAuthed : deliveryDatesIsoGuest;
  const activeSlots = isLoggedIn ? deliverySlotsAuthed : deliverySlotsGuest;
  const deliveryDates = useMemo<Date[]>(
    () => (activeDatesIso && activeDatesIso.length > 0
      ? activeDatesIso.map((iso) => new Date(iso))
      : getDeliveryDates(7)),
    [activeDatesIso],
  );
  const timeSlots = activeSlots && activeSlots.length > 0 ? activeSlots : DELIVERY_TIME_SLOTS;
  const [selectedDate, setSelectedDate] = useState<Date>(deliveryDates[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>(timeSlots[0].id);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Coupon UI is a thin wrapper over CartContext — same code powers the
  // cart, delivery, and payment summaries. Local state only tracks the input
  // buffer and the busy flag while `applyCoupon` awaits `previewOrder`.
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const couponStatus: 'idle' | 'success' | 'error' =
    couponCode ? 'success' : couponError ? 'error' : 'idle';

  // Client `total` already reflects the sale price (line items use
  // `item.price` with the strike-through UX). Prefer OE's `totalDue`
  // when OE actually applied an EXTRA reduction — a loyalty tier, a
  // coupon, OR the shopper spent bonus points. All three land honestly
  // on the visible total; ignoring `bonusApplied` here would leave the
  // Total row bigger than what OE actually charges.
  const bonusBurned = (preview?.bonusApplied ?? 0) > 0;
  const finalTotal = personalDiscount > 0 || couponDiscount > 0 || bonusBurned ? totalDue : total;

  const handleApplyCoupon = async () => {
    if (couponLoading) return;
    setCouponLoading(true);
    await applyCoupon(couponInput);
    setCouponLoading(false);
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponInput('');
  };

  // Address selection (for logged-in users with saved addresses)
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [newAddrForm, setNewAddrForm] = useState({ fullName: '', phone: '', line1: '', city: '', postcode: '', instructions: '' });
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});
  const [saveNewAddr, setSaveNewAddr] = useState(true);
  const [newAddrConfirmed, setNewAddrConfirmed] = useState(false);

  // Guest contact data for store / locker pickup (only used when !isLoggedIn).
  // We keep a SHARED state across both methods so switching back and forth
  // preserves what the guest already typed.
  const [guestContact, setGuestContact] = useState<GuestContactFormState>({ fullName: '', email: '', phone: '' });
  const [guestContactErrors, setGuestContactErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isLoggedIn && savedAddresses.length > 0) {
      setSelectedAddressId(savedAddresses[0].id);
    }
  }, [isLoggedIn, savedAddresses.length]);

  // Route-level guard: deep-linking `/checkout/delivery` with an empty
  // cart used to render the whole address form (and a $0 total). Bounce
  // back to the cart page as soon as the client knows the cart is
  // empty. Mirrors the PaymentPage guard.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    if (items.length === 0) router.push('/cart');
  }, [mounted, items.length, router]);

  const handleConfirmNewAddr = () => {
    const result = addressSchema.safeParse(newAddrForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      }
      setAddrErrors(errors);
      return;
    }
    setAddrErrors({});
    if (saveNewAddr) {
      const newAddr: OeAddress = {
        id: `a${crypto.randomUUID().slice(0, 8)}`,
        name: DH.newAddressHeading,
        fullName: newAddrForm.fullName,
        phone: newAddrForm.phone,
        line1: newAddrForm.line1,
        city: newAddrForm.city,
        postcode: newAddrForm.postcode,
        instructions: newAddrForm.instructions,
        full: `${newAddrForm.fullName} · ${newAddrForm.line1}, ${newAddrForm.city} ${newAddrForm.postcode} · ${newAddrForm.phone}`,
      };
      // Persist to OE (the call returns the address with a real recordId).
      void updateAddresses([...savedAddresses, newAddr]);
      setSelectedAddressId(newAddr.id);
    }
    setNewAddrConfirmed(true);
  };

  const handleContinueToPayment = () => {
    if (method === 'home') {
      const usingSavedAddr = isLoggedIn && savedAddresses.length > 0 && selectedAddressId !== 'new';
      if (!usingSavedAddr && !newAddrConfirmed) {
        const result = addressSchema.safeParse(newAddrForm);
        if (!result.success) {
          const errors: Record<string, string> = {};
          for (const issue of result.error.issues) {
            const field = issue.path[0] as string;
            if (!errors[field]) errors[field] = issue.message;
          }
          setAddrErrors(errors);
          return;
        }
      }
    } else if (!isLoggedIn) {
      // Guest selecting Store Pickup / Parcel Locker: must provide contact data
      // so we can notify them when the order is ready.
      const result = guestContactSchema.safeParse(guestContact);
      if (!result.success) {
        const errors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string;
          if (!errors[field]) errors[field] = issue.message;
        }
        setGuestContactErrors(errors);
        return;
      }
      setGuestContactErrors({});
    }
    // Persist delivery payload so PaymentPage can build the OE order body.
    // The shape mirrors what createOrderAction expects for each storage type.
    const storageByMethod: Record<DeliveryMethod, 'home' | 'store_pickup' | 'locker'> = {
      home: 'home',
      store: 'store_pickup',
      locker: 'locker',
    };
    const storage = storageByMethod[method];
    // Resolve the address actually used for home delivery (saved or freshly typed).
    const homeAddress = method === 'home'
      ? (() => {
          const usingSaved = isLoggedIn && savedAddresses.length > 0 && selectedAddressId !== 'new';
          const saved = usingSaved
            ? savedAddresses.find((a) => a.id === selectedAddressId) ?? savedAddresses[0]
            : null;
          if (saved) return {
            fullName: saved.fullName, phone: saved.phone, line1: saved.line1,
            city: saved.city, postcode: saved.postcode,
            instructions: saved.instructions ?? '',
          };
          return {
            fullName: newAddrForm.fullName, phone: newAddrForm.phone, line1: newAddrForm.line1,
            city: newAddrForm.city, postcode: newAddrForm.postcode,
            instructions: newAddrForm.instructions,
          };
        })()
      : null;
    const payload = {
      storage,
      isGuest: !isLoggedIn,
      guestContact: !isLoggedIn ? guestContact : null,
      homeAddress,
      // OE expects the numeric page id for the store `entity` form field.
      // Fall back to `.id` only when the store record has no `oeId` (i.e. the
      // hardcoded PICKUP_STORES fallback fired) — OE will reject it, which is
      // the correct outcome because there's no matching store in the tenant.
      storeId: method === 'store' ? (selectedStore.oeId ?? selectedStore.id) : null,
      lockerId: method === 'locker' ? PARCEL_LOCKERS.indexOf(selectedLocker) : null,
      deliveryDate: selectedDate.toISOString(),
      deliverySlot: selectedSlot,
      couponCode: couponCode,
    };
    try {
      sessionStorage.setItem('oe_checkout_payload', JSON.stringify(payload));
    } catch { /* ignore — feature degrades gracefully */ }
    router.push('/checkout/payment');
  };

  useEffect(() => {
    if (!isLoggedIn) setShowGuestModal(true);
    else setShowGuestModal(false);
  }, [isLoggedIn]);

  return (
    <div
      className="min-h-screen bg-white font-[Inter,sans-serif]"
      style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}
    >

      {showGuestModal && (
        <GuestCheckoutModal
          onClose={() => setShowGuestModal(false)}
          onSignIn={() => { setShowGuestModal(false); openLoginModal(); }}
          onRegister={() => { setShowGuestModal(false); openRegisterModal(); }}
          onContinueAsGuest={() => setShowGuestModal(false)}
        />
      )}

      <Header />

      <main id="main-content" className="max-w-screen-xl mx-auto px-4 lg:px-8 pb-20">
        {/* Stepper */}
        <div className="border-b border-[#e5e7eb]">
          <CheckoutStepper currentStep={1} />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 pt-8">
          {/* ── Left: Delivery Options ── */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl tracking-[0.15em] uppercase mb-6 font-bold">
              {L.pageTitle}
            </h1>

            <DeliveryMethodHome
              checked={method === 'home'}
              onChange={() => setMethod('home')}
              isLoggedIn={isLoggedIn}
              savedAddresses={savedAddresses}
              selectedAddressId={selectedAddressId}
              setSelectedAddressId={setSelectedAddressId}
              newAddrForm={newAddrForm}
              setNewAddrForm={setNewAddrForm}
              addrErrors={addrErrors}
              setAddrErrors={setAddrErrors}
              newAddrConfirmed={newAddrConfirmed}
              setNewAddrConfirmed={setNewAddrConfirmed}
              saveNewAddr={saveNewAddr}
              setSaveNewAddr={setSaveNewAddr}
              onConfirmNewAddr={handleConfirmNewAddr}
              deliveryDates={deliveryDates}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
              timeSlots={timeSlots}
            />

            <DeliveryMethodStore
              checked={method === 'store'}
              onChange={() => setMethod('store')}
              stores={stores}
              selectedStore={selectedStore}
              setSelectedStore={setSelectedStore}
              storeDropOpen={storeDropOpen}
              setStoreDropOpen={setStoreDropOpen}
              isLoggedIn={isLoggedIn}
              guestContact={guestContact}
              setGuestContact={setGuestContact}
              guestContactErrors={guestContactErrors}
            />

            <DeliveryMethodLocker
              checked={method === 'locker'}
              onChange={() => setMethod('locker')}
              selectedLocker={selectedLocker}
              setSelectedLocker={setSelectedLocker}
              lockerDropOpen={lockerDropOpen}
              setLockerDropOpen={setLockerDropOpen}
              isLoggedIn={isLoggedIn}
              guestContact={guestContact}
              setGuestContact={setGuestContact}
              guestContactErrors={guestContactErrors}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => router.push('/cart')}
                className="flex items-center gap-2 text-sm focus-visible:outline-none hover:opacity-70 transition-opacity text-[#555]"
              >
                {lBackToCart}
              </button>
              <button
                onClick={handleContinueToPayment}
                className="px-10 py-4 text-white text-sm tracking-[0.2em] uppercase focus-visible:outline-none hover:opacity-90 transition-opacity bg-black rounded-lg font-semibold"
              >
                {lContinue}
              </button>
            </div>
          </div>

          {/* ── Right: Order Summary (client-only) ── */}
          <DeliveryOrderSummary
            summaryOpen={summaryOpen}
            setSummaryOpen={setSummaryOpen}
            appliedCoupon={couponCode}
            couponInput={couponInput}
            setCouponInput={setCouponInput}
            couponStatus={couponStatus}
            couponError={couponError}
            couponLoading={couponLoading}
            handleApplyCoupon={handleApplyCoupon}
            handleRemoveCoupon={handleRemoveCoupon}
            couponDiscount={couponDiscount}
            personalDiscount={personalDiscount - couponDiscount}
            finalTotal={finalTotal}
            previewLoading={previewLoading}
            hasPreview={preview !== null}
            giftItems={giftItems}
          />
        </div>
      </main>

      {/* OE-attached blocks for the `delivery_method` page — rendered
          below the form, before the footer. */}
      {pageBlocks && pageBlocks.length > 0 && (
        <PageBlocksRenderer blocks={pageBlocks} />
      )}

      <Footer />
    </div>
  );
}
