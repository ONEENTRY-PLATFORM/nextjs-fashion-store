'use client'
import { useEffect, useState } from 'react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { CheckoutStepper } from '../components/CheckoutStepper';
import { useCart } from '../context/CartContext';
import { CheckCircle, Package, Mail, ArrowRight } from 'lucide-react';

import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import { fmt } from '../utils/formatPrice';
import { CONFIRMATION_LABELS as L, CONFIRMATION_INFO_CARDS } from '../data/confirmationLabels';
import { CART_LINE_LABELS as CLL } from '../data/commonLabels';
import { useT } from '../../lib/oneentry/labels/CheckoutLabelsContext';

const ICON_MAP = {
  mail:    <Mail size={20} />,
  package: <Package size={20} />,
  check:   <CheckCircle size={20} />,
} as const;

function randomOrderId() {
  return 'OE-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

interface ConfirmationPageProps {
  /** Order-success line authored in the OE admin panel
   *  (`checkout_home_delivery.localizeInfos.successMessage`). When present it
   *  overrides the literal heading; `null` falls back to `L.heading`. */
  successMessage?: string | null;
}

export function ConfirmationPage({ successMessage }: ConfirmationPageProps = {}) {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [orderId, setOrderId] = useState<string | null>(null);
  // Snapshot of the actually-charged amount stashed by `PaymentPage.
  // handlePlaceOrder` right before it clears the cart. Without it, `total`
  // reads 0 (cart empty by the time we get here) and the "Total Paid"
  // line renders $0 / the loyalty-points hint uses $0 as the base.
  const [paidTotal, setPaidTotal] = useState<number | null>(null);

  const lHeading       = useT('checkout_confirmed', 'checkout_confirmed_titel',                    successMessage || L.heading);
  const lSub           = useT('checkout_confirmed', 'checkout_confirmed_text',                     L.subheading);
  const lOrderIdLabel  = useT('checkout_confirmed', 'checkout_confirmed_id',                       L.orderIdLabel);
  const lLoyaltyPre    = useT('checkout_confirmed', 'checkout_confirmed_bonus_text_1',             L.loyaltyPrefix);
  const lLoyaltyAmt    = useT('checkout_confirmed', 'checkout_confirmed_bonus_text_2',             L.loyaltyAmountSuffix);
  const lLoyaltySuf    = useT('checkout_confirmed', 'checkout_confirmed_bonus_text_3',             L.loyaltySuffix);
  const lCtaPrimary    = useT('checkout_confirmed', 'checkout_confirmed_continue_cta',             L.ctaPrimary);
  const lCtaSecondary  = useT('checkout_confirmed', 'checkout_confirmed_new_arrivals_cta',         L.ctaSecondary);
  const lConfirmTitle  = useT('checkout_confirmed', 'checkout_confirmed_confirmation_sent_title',  CONFIRMATION_INFO_CARDS[0].title);
  const lConfirmText   = useT('checkout_confirmed', 'checkout_confirmed_confirmation_sent_text',   CONFIRMATION_INFO_CARDS[0].desc);
  const lProcTitle     = useT('checkout_confirmed', 'checkout_confirmed_processing_title',         CONFIRMATION_INFO_CARDS[1].title);
  const lProcText      = useT('checkout_confirmed', 'checkout_confirmed_processing_text',          CONFIRMATION_INFO_CARDS[1].desc);
  const lEstTitle      = useT('checkout_confirmed', 'checkout_confirmed_estimated_title',          CONFIRMATION_INFO_CARDS[2].title);
  const lEstText       = useT('checkout_confirmed', 'checkout_confirmed_estimated_text',           CONFIRMATION_INFO_CARDS[2].desc);

  const infoCards = [
    { iconKey: 'mail'    as const, title: lConfirmTitle, desc: lConfirmText },
    { iconKey: 'package' as const, title: lProcTitle,    desc: lProcText },
    { iconKey: 'check'   as const, title: lEstTitle,     desc: lEstText },
  ];

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // Prefer the real OE order id stashed by PaymentPage. Random fallback is
    // only for edge cases (opened /confirmation directly, sessionStorage
    // cleared by Stripe round-trip on some browsers) so we still render
    // *something* instead of "null".
    let realId: string | null = null;
    try { realId = sessionStorage.getItem('oe_last_order_id'); } catch { /* ignore */ }
    setOrderId(realId && realId.length > 0 ? realId : randomOrderId());
    try { sessionStorage.removeItem('oe_last_order_id'); } catch { /* ignore */ }
    let savedTotal: number | null = null;
    try {
      const raw = sessionStorage.getItem('oe_last_order_total');
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0) savedTotal = n;
      }
    } catch { /* ignore */ }
    setPaidTotal(savedTotal);
    try { sessionStorage.removeItem('oe_last_order_total'); } catch { /* ignore */ }
    const timer = setTimeout(() => clearCart(), 200);
    return () => clearTimeout(timer);
  }, [clearCart]);

  return (
    <div
      className="min-h-screen bg-white font-[Inter,sans-serif]"
      style={{ '--accent': ACCENT } as React.CSSProperties}
    >
      <Header />

      <main id="main-content" className="max-w-screen-xl mx-auto px-4 lg:px-8 pb-20">
        {/* Stepper */}
        <div className="border-b border-[#e5e7eb]">
          <CheckoutStepper currentStep={3} />
        </div>

        <div className="max-w-2xl mx-auto pt-12 pb-8 text-center">
          {/* Success icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 flex items-center justify-center bg-[#f0fdf4] border-2 border-green-600">
              <CheckCircle size={40} className="text-green-600" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl tracking-[0.1em] uppercase mb-2 font-bold">
            {lHeading}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {lSub}
          </p>

          {/* Order ID */}
          <div className="inline-flex items-center gap-3 px-6 py-3 mb-8 border border-[#e5e7eb] bg-[#fafafa]">
            <Package size={16} className="text-[var(--accent)]" />
            <span className="text-sm">
              {lOrderIdLabel}: <strong>{orderId}</strong>
            </span>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {infoCards.map(card => (
              <div
                key={card.title}
                className="flex flex-col items-center gap-2 px-4 py-5 text-center border border-[#e5e7eb]"
              >
                <span className="text-[var(--accent)]">{ICON_MAP[card.iconKey]}</span>
                <p className="text-xs tracking-wide uppercase font-bold">
                  {card.title}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Order summary mini */}
          {mounted && items.length > 0 && (
            <div className="mb-8 text-left border border-[#e5e7eb]">
              <div className="px-5 py-3 border-b border-[#e5e7eb] bg-[#fafafa]">
                <p className="text-xs tracking-[0.15em] uppercase font-bold">
                  {L.itemsHeader}
                </p>
              </div>
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-5 py-4 border-b border-[#f0f0f0]"
                >
                  <div className="relative w-12 h-14 flex-shrink-0">
                    <ImageWithFallback src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-gray-400">{CLL.sizeLabel} {item.size} · {CLL.qtyLabel} {item.quantity}</p>
                  </div>
                  <p className="text-sm flex-shrink-0 font-bold">
                    {fmt(item.price * item.quantity)}
                  </p>
                </div>
              ))}
              <div className="flex justify-between items-center px-5 py-4">
                <span className="text-sm tracking-wide uppercase font-bold">{L.totalPaid}</span>
                <span className="text-lg font-bold">{fmt(paidTotal ?? total)}</span>
              </div>
            </div>
          )}

          {/* Loyalty points */}
          <div className="flex items-center justify-center gap-2 px-6 py-3 mb-8 bg-[#fff8f8] border border-[var(--accent)]">
            <span className="text-base text-[var(--accent)]">★</span>
            <span className="text-sm text-[#555]">
              {lLoyaltyPre} <strong className="text-black">{Math.floor((paidTotal ?? total) * 10)} {lLoyaltyAmt}</strong> {lLoyaltySuf}
            </span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push(L.ctaPrimaryHref)}
              className="flex items-center justify-center gap-2 px-8 py-4 text-white text-sm tracking-[0.2em] uppercase focus-visible:outline-none hover:opacity-90 transition-opacity bg-black rounded-none font-bold"
            >
              {lCtaPrimary} <ArrowRight size={14} />
            </button>
            <button
              onClick={() => router.push(L.ctaSecondaryHref)}
              className="px-8 py-4 text-sm tracking-[0.2em] uppercase focus-visible:outline-none hover:bg-gray-50 transition-colors border border-black rounded-none font-semibold"
            >
              {lCtaSecondary}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
