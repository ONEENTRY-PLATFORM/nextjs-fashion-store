'use client';
import { ArrowRight, CheckCircle, Mail, Package } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { CheckoutStepper } from '@/app/components/checkout/CheckoutStepper';
import { ImageWithFallback } from '@/app/components/ui/ImageWithFallback';
import { ACCENT_WOMEN as ACCENT } from '@/app/constants/colors';
import { useCart } from '@/app/context/CartContext';
import { CART_LINE_LABELS } from '@/app/data/commonLabels';
import { CONFIRMATION_INFO_CARDS, CONFIRMATION_LABELS } from '@/app/data/confirmationLabels';
import { useMounted } from '@/app/hooks/useMounted';
import { fmt } from '@/app/utils/formatPrice';
import { useRouter } from '@/lib/i18n/navigation';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

const ICON_MAP = {
  mail: <Mail size={20} />,
  package: <Package size={20} />,
  check: <CheckCircle size={20} />,
} as const;

function randomOrderId() {
  return 'OE-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

interface ConfirmationPageProps {
  /**
   * Order-success line authored in the OE admin panel
   *  (`checkout_home_delivery.localizeInfos.successMessage`). When present it
   *  overrides the literal heading; `null` falls back to `L.heading`.
   */
  successMessage?: string | null;
}

export function ConfirmationPage({ successMessage }: ConfirmationPageProps = {}) {
  const CLL = useDict('interface_controls_cart_line_', CART_LINE_LABELS);
  const L = useDict('checkout_confirmed_', CONFIRMATION_LABELS);
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [orderId, setOrderId] = useState<string | null>(null);
  // Snapshot of the actually-charged amount stashed by `PaymentPage.
  // handlePlaceOrder` right before it clears the cart. Without it, `total`
  // reads 0 (cart empty by the time we get here) and the "Total Paid"
  // line renders $0 / the loyalty-points hint uses $0 as the base.
  const [paidTotal, setPaidTotal] = useState<number | null>(null);

  const lHeading = useT('checkout_confirmed_titel', successMessage || L.heading);
  const lSub = useT('checkout_confirmed_text', L.subheading);
  const lOrderIdLabel = useT('checkout_confirmed_id', L.orderIdLabel);
  const lLoyaltyPre = useT('checkout_confirmed_bonus_text_1', L.loyaltyPrefix);
  const lLoyaltyAmt = useT('checkout_confirmed_bonus_text_2', L.loyaltyAmountSuffix);
  const lLoyaltySuf = useT('checkout_confirmed_bonus_text_3', L.loyaltySuffix);
  const lCtaPrimary = useT('checkout_confirmed_continue_cta', L.ctaPrimary);
  const lCtaSecondary = useT('checkout_confirmed_new_arrivals_cta', L.ctaSecondary);
  const lConfirmTitle = useT('checkout_confirmed_confirmation_sent_title', CONFIRMATION_INFO_CARDS[0].title);
  const lConfirmText = useT('checkout_confirmed_confirmation_sent_text', CONFIRMATION_INFO_CARDS[0].desc);
  const lProcTitle = useT('checkout_confirmed_processing_title', CONFIRMATION_INFO_CARDS[1].title);
  const lProcText = useT('checkout_confirmed_processing_text', CONFIRMATION_INFO_CARDS[1].desc);
  const lEstTitle = useT('checkout_confirmed_estimated_title', CONFIRMATION_INFO_CARDS[2].title);
  const lEstText = useT('checkout_confirmed_estimated_text', CONFIRMATION_INFO_CARDS[2].desc);

  const infoCards = [
    { iconKey: 'mail' as const, title: lConfirmTitle, desc: lConfirmText },
    { iconKey: 'package' as const, title: lProcTitle, desc: lProcText },
    { iconKey: 'check' as const, title: lEstTitle, desc: lEstText },
  ];

  const mounted = useMounted();
  // The handoff keys are consumed on read, so this effect must run its read
  // exactly once per mounted component. Under React Strict Mode the effect
  // fires twice: the first pass took the real order id and deleted it, the
  // second found an empty slot and replaced it with a random `OE-XXXXXXXX` —
  // the receipt showed a fake number and `$0` worth of loyalty points.
  const handoffRead = useRef(false);
  useEffect(() => {
    // Deferred one microtask: reading (and consuming) the sessionStorage
    // handoff can only happen in the browser, but writing the result
    // synchronously inside the effect would trigger a cascading render pass.
    queueMicrotask(() => {
      if (handoffRead.current) return;
      handoffRead.current = true;
      // Prefer the real OE order id stashed by PaymentPage. Random fallback is
      // only for edge cases (opened /confirmation directly, sessionStorage
      // cleared by Stripe round-trip on some browsers) so we still render
      // *something* instead of "null".
      let realId: string | null = null;
      try {
        realId = sessionStorage.getItem('oe_last_order_id');
      } catch {
        /* ignore */
      }
      setOrderId(realId && realId.length > 0 ? realId : randomOrderId());
      try {
        sessionStorage.removeItem('oe_last_order_id');
      } catch {
        /* ignore */
      }
      let savedTotal: number | null = null;
      try {
        const raw = sessionStorage.getItem('oe_last_order_total');
        if (raw) {
          const n = Number(raw);
          if (Number.isFinite(n) && n >= 0) savedTotal = n;
        }
      } catch {
        /* ignore */
      }
      setPaidTotal(savedTotal);
      try {
        sessionStorage.removeItem('oe_last_order_total');
      } catch {
        /* ignore */
      }
    });
    const timer = setTimeout(() => clearCart(), 200);
    return () => clearTimeout(timer);
  }, [clearCart]);

  return (
    <div className="flex-1 bg-white font-sans" style={{ '--accent': ACCENT } as React.CSSProperties}>
      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        {/* Stepper */}
        <div className="border-b border-[#e5e7eb]">
          <CheckoutStepper currentStep={3} />
        </div>

        <div className="mx-auto max-w-2xl pt-12 pb-8 text-center">
          {/* Success icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex size-20 items-center justify-center border-2 border-green-600 bg-[#f0fdf4]">
              <CheckCircle size={40} className="text-green-600" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="mb-2 text-2xl font-bold tracking-widest uppercase">{lHeading}</h1>
          <p className="mb-6 text-sm text-gray-500">{lSub}</p>

          {/* Order ID */}
          <div className="mb-8 inline-flex items-center gap-3 border border-[#e5e7eb] bg-[#fafafa] px-6 py-3">
            <Package size={16} className="text-accent" />
            <span className="text-sm">
              {lOrderIdLabel}: <strong>{orderId}</strong>
            </span>
          </div>

          {/* Info cards */}
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {infoCards.map((card) => (
              <div
                key={card.title}
                className="flex flex-col items-center gap-2 border border-[#e5e7eb] px-4 py-5 text-center"
              >
                <span className="text-accent">{ICON_MAP[card.iconKey]}</span>
                <p className="text-xs font-bold tracking-wide uppercase">{card.title}</p>
                <p className="text-xs leading-relaxed text-gray-500">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Order summary mini */}
          {mounted && items.length > 0 && (
            <div className="mb-8 border border-[#e5e7eb] text-left">
              <div className="border-b border-[#e5e7eb] bg-[#fafafa] px-5 py-3">
                <p className="text-xs font-bold tracking-[0.15em] uppercase">{L.itemsHeader}</p>
              </div>
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 border-b border-[#f0f0f0] px-5 py-4">
                  <div className="relative h-14 w-12 shrink-0">
                    <ImageWithFallback src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {CLL.sizeLabel} {item.size} · {CLL.qtyLabel} {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold">{fmt(item.price * item.quantity)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-bold tracking-wide uppercase">{L.totalPaid}</span>
                <span className="text-lg font-bold">{fmt(paidTotal ?? total)}</span>
              </div>
            </div>
          )}

          {/* Loyalty points */}
          <div className="mb-8 flex items-center justify-center gap-2 border border-accent bg-[#fff8f8] px-6 py-3">
            <span className="text-base text-accent">★</span>
            <span className="text-sm text-[#555]">
              {lLoyaltyPre}{' '}
              <strong className="text-black">
                {Math.floor((paidTotal ?? total) * 10)} {lLoyaltyAmt}
              </strong>{' '}
              {lLoyaltySuf}
            </span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => router.push(L.ctaPrimaryHref)}
              className="flex items-center justify-center gap-2 rounded-none bg-black px-8 py-4 text-sm font-bold tracking-[0.2em] text-white uppercase transition-opacity hover:opacity-90 focus-visible:outline-none"
            >
              {lCtaPrimary} <ArrowRight size={14} />
            </button>
            <button
              onClick={() => router.push(L.ctaSecondaryHref)}
              className="rounded-none border border-black px-8 py-4 text-sm font-semibold tracking-[0.2em] uppercase transition-colors hover:bg-gray-50 focus-visible:outline-none"
            >
              {lCtaSecondary}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
