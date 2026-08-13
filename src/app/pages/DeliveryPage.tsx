'use client';
import dynamic from 'next/dynamic';
import React, { useEffect, useMemo, useState } from 'react';

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { CheckoutStepper } from '@/app/components/checkout/CheckoutStepper';
import { useCart } from '@/app/context/CartContext';

// Render Order Summary client-only — its content reads from the Redux cart slice which hydrates from localStorage after mount.
const DeliveryOrderSummary = dynamic(
  () => import('./checkout/DeliveryOrderSummary').then((m) => m.DeliveryOrderSummary),
  { ssr: false },
);
import { ACCENT_WOMEN as ACCENT, SALE_COLOR } from '@/app/constants/colors';
import { useAuth } from '@/app/context/AuthContext';
import {
  DELIVERY_TIME_SLOTS,
  PARCEL_LOCKERS,
  type ParcelLocker,
  PICKUP_STORES,
  type PickupStore,
} from '@/app/data/checkoutConfig';
import { useMounted } from '@/app/hooks/useMounted';
import { DELIVERY_METHOD_HOME_LABELS } from '@/app/pages/checkout/copy';
import { useSchemas } from '@/app/utils/useFormMessages';
import { useRouter } from '@/lib/i18n/navigation';
import type { OeAddress } from '@/lib/oneentry/auth/actions';
import type { DeliveryTimeSlot } from '@/lib/oneentry/checkout/delivery-schedule';
import { useDeliveryMethodInfo } from '@/lib/oneentry/checkout/DeliveryMethodInfoContext';
import { buildCheckoutBounds } from '@/lib/oneentry/checkout/field-bounds';
import { useFormContent } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { DeliveryMethodHome } from './checkout/DeliveryMethodHome';
import { DeliveryMethodLocker } from './checkout/DeliveryMethodLocker';
import { DeliveryMethodStore } from './checkout/DeliveryMethodStore';
import { GuestCheckoutModal } from './checkout/GuestCheckoutModal';
import { type GuestContactFormState } from './checkout/GuestContactForm';

export const DELIVERY_PAGE_LABELS = {
  pageTitle: 'Delivery Method',
  backToCart: '← Back to Cart',
  continueToPayment: 'Continue to Payment',
} as const;

type DeliveryMethod = 'home' | 'store' | 'locker';

/** Client-only fallback: when the server layer didn't hand a date strip down (e.g. Storybook / bare unit test render), synthesise the same "tomorrow, skip Sundays, 7 dates" shape the OE loader would produce from its own fallback config. */
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
  /** Pickup stores loaded from OE by the server layer. */
  pickupStores?: PickupStore[];
  /** Parcel lockers loaded from OE by the server layer, each carrying the page id the order references. */
  parcelLockers?: ParcelLocker[];
  /** ISO-serialised date strip for the authed variant. */
  deliveryDatesIsoAuthed?: string[];
  /** ISO-serialised date strip for the guest variant — built from `checkout_home_delivery_guest`'s schedule config. */
  deliveryDatesIsoGuest?: string[];
  /** Slots from `checkout_home_delivery.delivery_slot`. Fallback: `DELIVERY_TIME_SLOTS`. */
  deliverySlotsAuthed?: DeliveryTimeSlot[];
  /** Slots from `checkout_home_delivery_guest.delivery_slot_guest`. */
  deliverySlotsGuest?: DeliveryTimeSlot[];
  /** OE-attached blocks for the `delivery_method` page. */
  pageBlocks?: import('@/lib/oneentry/blocks/page-blocks').PageBlock[];
}

export function DeliveryPage({
  pickupStores,
  parcelLockers,
  deliveryDatesIsoAuthed,
  deliveryDatesIsoGuest,
  deliverySlotsAuthed,
  deliverySlotsGuest,
  pageBlocks,
}: DeliveryPageProps = {}) {
  const DH = useDict('checkout_delivery_', DELIVERY_METHOD_HOME_LABELS);
  const L = useDict('checkout_delivery_page_', DELIVERY_PAGE_LABELS);
  const router = useRouter();
  // Same source the radio cards render from — it also carries each option's submitted value, which the order needs at the payment step.
  const methodInfo = useDeliveryMethodInfo();
  const { isLoggedIn, openLoginModal, openRegisterModal, user, updateAddresses } = useAuth();
  // Fall back to the literal list if the server layer didn't hand any down — keeps Storybook and unit tests that render <DeliveryPage /> bare working.
  const stores: PickupStore[] = pickupStores && pickupStores.length > 0 ? pickupStores : PICKUP_STORES;
  const lockers: ParcelLocker[] = parcelLockers && parcelLockers.length > 0 ? parcelLockers : PARCEL_LOCKERS;
  const {
    items,
    total,
    personalDiscount,
    totalDue,
    couponCode,
    couponDiscount,
    couponError,
    applyCoupon,
    removeCoupon,
    giftItems,
    preview,
    previewLoading,
  } = useCart();
  const lBackToCart = useT('checkout_delivery_back_to_cart', L.backToCart);
  const lContinue = useT('checkout_delivery_continue_to_payment', L.continueToPayment);
  // Saved addresses come straight from OE for the signed-in user.
  const savedAddresses = user?.addresses ?? [];

  const [method, setMethod] = useState<DeliveryMethod>('home');
  const [selectedStore, setSelectedStore] = useState<PickupStore>(stores[0]);
  const [selectedLocker, setSelectedLocker] = useState(lockers[0]);
  // OE enforces per-field length limits on the form the order lands in, and rejects the whole order when one is missed.
  const guestHomeForm = useFormContent('checkout_home_delivery_guest');
  const savedAddressForm = useFormContent('user_addresses');
  const storeGuestForm = useFormContent('checkout_store_pickup_guest');
  const lockerGuestForm = useFormContent('checkout_locker_guest');
  const checkoutBounds = useMemo(
    () =>
      buildCheckoutBounds({
        isLoggedIn,
        method,
        forms: {
          user_addresses: savedAddressForm,
          checkout_home_delivery_guest: guestHomeForm,
          checkout_store_pickup_guest: storeGuestForm,
          checkout_locker_guest: lockerGuestForm,
        },
      }),
    [isLoggedIn, method, savedAddressForm, guestHomeForm, storeGuestForm, lockerGuestForm],
  );
  const schemas = useSchemas(checkoutBounds);

  const [storeDropOpen, setStoreDropOpen] = useState(false);
  const [lockerDropOpen, setLockerDropOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  // Pick the OE schedule for the current auth state.
  const activeDatesIso = isLoggedIn ? deliveryDatesIsoAuthed : deliveryDatesIsoGuest;
  const activeSlots = isLoggedIn ? deliverySlotsAuthed : deliverySlotsGuest;
  const deliveryDates = useMemo<Date[]>(
    () =>
      activeDatesIso && activeDatesIso.length > 0 ? activeDatesIso.map((iso) => new Date(iso)) : getDeliveryDates(7),
    [activeDatesIso],
  );
  const timeSlots = activeSlots && activeSlots.length > 0 ? activeSlots : DELIVERY_TIME_SLOTS;
  const [selectedDate, setSelectedDate] = useState<Date>(deliveryDates[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>(timeSlots[0].id);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Coupon UI is a thin wrapper over CartContext — same code powers the cart, delivery, and payment summaries.
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const couponStatus: 'idle' | 'success' | 'error' = couponCode ? 'success' : couponError ? 'error' : 'idle';

  // Client `total` already reflects the sale price (line items use `item.price` with the strike-through UX).
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
  const [newAddrForm, setNewAddrForm] = useState({
    fullName: '',
    phone: '',
    line1: '',
    city: '',
    postcode: '',
    instructions: '',
  });
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});
  const [saveNewAddr, setSaveNewAddr] = useState(true);
  const [newAddrConfirmed, setNewAddrConfirmed] = useState(false);

  // Guest contact data for store / locker pickup (only used when !isLoggedIn).
  const [guestContact, setGuestContact] = useState<GuestContactFormState>({ fullName: '', email: '', phone: '' });
  const [guestContactErrors, setGuestContactErrors] = useState<Record<string, string>>({});

  // Preselect the shopper's first saved address as soon as the account data lands.
  const defaultAddressId = isLoggedIn ? (savedAddresses[0]?.id ?? null) : null;
  const [prevDefaultAddressId, setPrevDefaultAddressId] = useState<string | null>(null);
  if (defaultAddressId !== prevDefaultAddressId) {
    setPrevDefaultAddressId(defaultAddressId);
    if (defaultAddressId) setSelectedAddressId(defaultAddressId);
  }

  // Route-level guard: deep-linking `/checkout/delivery` with an empty cart used to render the whole address form (and a $0 total).
  const mounted = useMounted();
  useEffect(() => {
    if (!mounted) return;
    if (items.length === 0) router.push('/cart');
  }, [mounted, items.length, router]);

  const handleConfirmNewAddr = () => {
    const result = schemas.addressSchema.safeParse(newAddrForm);
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
        const result = schemas.addressSchema.safeParse(newAddrForm);
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
      // Guest selecting Store Pickup / Parcel Locker: must provide contact data so we can notify them when the order is ready.
      const result = schemas.guestContactSchema.safeParse(guestContact);
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
    const storageByMethod: Record<DeliveryMethod, 'home' | 'store_pickup' | 'locker'> = {
      home: 'home',
      store: 'store_pickup',
      locker: 'locker',
    };
    const storage = storageByMethod[method];
    // Resolve the address actually used for home delivery (saved or freshly typed).
    const homeAddress =
      method === 'home'
        ? (() => {
            const usingSaved = isLoggedIn && savedAddresses.length > 0 && selectedAddressId !== 'new';
            const saved = usingSaved
              ? (savedAddresses.find((a) => a.id === selectedAddressId) ?? savedAddresses[0])
              : null;
            if (saved)
              return {
                fullName: saved.fullName,
                phone: saved.phone,
                line1: saved.line1,
                city: saved.city,
                postcode: saved.postcode,
                instructions: saved.instructions ?? '',
              };
            return {
              fullName: newAddrForm.fullName,
              phone: newAddrForm.phone,
              line1: newAddrForm.line1,
              city: newAddrForm.city,
              postcode: newAddrForm.postcode,
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
      storeId: method === 'store' ? (selectedStore.oeId ?? selectedStore.id) : null,
      // The locker's OE page id.
      lockerId: method === 'locker' ? selectedLocker.oeId : null,
      deliveryDate: selectedDate.toISOString(),
      deliverySlot: selectedSlot,
      // The `delivery_method` option value as authored in OE.
      deliveryMethodValue: methodInfo ? methodInfo[method].value : '',
      couponCode: couponCode,
    };
    try {
      sessionStorage.setItem('oe_checkout_payload', JSON.stringify(payload));
    } catch {
      /* ignore — feature degrades gracefully */
    }
    router.push('/checkout/payment');
  };

  // The guest-checkout prompt tracks auth state directly — again adjusted during render rather than mirrored from an effect.
  const [prevIsLoggedIn, setPrevIsLoggedIn] = useState(true);
  if (isLoggedIn !== prevIsLoggedIn) {
    setPrevIsLoggedIn(isLoggedIn);
    setShowGuestModal(!isLoggedIn);
  }

  return (
    <div
      className="flex-1 bg-white font-sans"
      style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}
    >
      {showGuestModal && (
        <GuestCheckoutModal
          onClose={() => setShowGuestModal(false)}
          onSignIn={() => {
            setShowGuestModal(false);
            openLoginModal();
          }}
          onRegister={() => {
            setShowGuestModal(false);
            openRegisterModal();
          }}
          onContinueAsGuest={() => setShowGuestModal(false)}
        />
      )}

      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        {/* Stepper */}
        <div className="border-b border-[#e5e7eb]">
          <CheckoutStepper currentStep={1} />
        </div>

        <div className="flex flex-col gap-8 pt-8 lg:flex-row">
          {/* ── Left: Delivery Options ── */}
          <div className="min-w-0 flex-1">
            <h1 className="mb-6 text-xl font-bold tracking-[0.15em] uppercase">{L.pageTitle}</h1>

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
              lockers={lockers}
              isLoggedIn={isLoggedIn}
              guestContact={guestContact}
              setGuestContact={setGuestContact}
              guestContactErrors={guestContactErrors}
            />

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => router.push('/cart')}
                className="flex items-center gap-2 text-sm text-[#555] transition-opacity hover:opacity-70 focus-visible:outline-none"
              >
                {lBackToCart}
              </button>
              <button
                onClick={handleContinueToPayment}
                data-testid="delivery-continue"
                className="rounded-lg bg-black px-10 py-4 text-sm font-semibold tracking-[0.2em] text-white uppercase transition-opacity hover:opacity-90 focus-visible:outline-none"
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
      {pageBlocks && pageBlocks.length > 0 && <PageBlocksRenderer blocks={pageBlocks} />}
    </div>
  );
}
